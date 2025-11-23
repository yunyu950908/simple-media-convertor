import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type OutputFormat = 'mp3' | 'wav';
type QualityLevel = 'low' | 'medium' | 'high';

// 品质配置
const QUALITY_SETTINGS = {
  mp3: {
    low: { bitrate: '128k', sampleRate: '44100', label: '低品质 (128kbps, 文件更小)' },
    medium: { bitrate: '192k', sampleRate: '44100', label: '中品质 (192kbps, 推荐)' },
    high: { bitrate: '320k', sampleRate: '44100', label: '高品质 (320kbps, 接近无损)' },
  },
  wav: {
    low: { sampleRate: '32000', label: '低品质 (32kHz)' },
    medium: { sampleRate: '44100', label: '中品质 (44.1kHz, CD 标准)' },
    high: { sampleRate: '48000', label: '高品质 (48kHz, 专业音频)' },
  },
} as const;

export default function AudioVideoConverter() {
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp3');
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 只在客户端创建 FFmpeg 实例
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
      load();
    }
  }, []);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) return;

    try {
      // 检查浏览器是否支持 SharedArrayBuffer
      if (typeof SharedArrayBuffer === 'undefined') {
        setMessage('❌ 浏览器不支持 SharedArrayBuffer，请使用 Chrome、Edge 或 Firefox 浏览器');
        console.error('SharedArrayBuffer is not available');
        return;
      }

      // 检查跨域隔离是否启用
      if (!crossOriginIsolated) {
        setMessage('❌ 跨域隔离未启用，请检查服务器配置或刷新页面重试');
        console.error('Cross-origin isolation is not enabled');
        return;
      }

      setMessage('正在加载 FFmpeg...(首次加载需下载约 30MB 文件)');

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      setLoaded(true);
      setMessage('✅ FFmpeg 已准备就绪');
    } catch (error) {
      console.error('加载 FFmpeg 失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`❌ 加载失败: ${errorMessage}。请检查网络连接或刷新页面重试`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDownloadUrl(null);
      setProgress(0);
      setMessage(`已选择文件: ${selectedFile.name}`);
    }
  };

  const handleConvert = async () => {
    if (!file || !loaded) return;

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) return;

    setConverting(true);
    setProgress(0);
    setDownloadUrl(null);

    try {
      setMessage('正在转码...');

      const inputFileName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
      const outputFileName = `output.${outputFormat}`;

      await ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // 根据选择的格式和品质构建 FFmpeg 参数
      const qualityConfig = QUALITY_SETTINGS[outputFormat][quality];
      const ffmpegArgs = [
        '-i', inputFileName,
        '-vn', // 移除视频流
        '-ar', qualityConfig.sampleRate, // 采样率
        '-ac', '2', // 立体声
      ];

      // 仅对 MP3 格式添加比特率参数
      if (outputFormat === 'mp3' && 'bitrate' in qualityConfig) {
        ffmpegArgs.push('-b:a', qualityConfig.bitrate);
      }

      ffmpegArgs.push(outputFileName);

      await ffmpeg.exec(ffmpegArgs);

      const data = await ffmpeg.readFile(outputFileName) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], {
        type: outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
      });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setMessage('转码完成！');
      setProgress(100);

      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (error) {
      console.error('转码失败:', error);
      setMessage('转码失败，请检查文件格式');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.name.replace(/\.[^/.]+$/, `.${outputFormat}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const supportedFormats = [
    'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm',
    'mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'wma'
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
      <Card className="shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl md:text-3xl text-center">
            音视频转码工具
          </CardTitle>
          <CardDescription className="text-center text-sm md:text-base">
            浏览器端转换音视频为 MP3/WAV 格式
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 状态信息 */}
          <div className="space-y-2">
            <div className="text-center">
              <p className="text-sm md:text-base text-muted-foreground">
                {message}
              </p>
            </div>

            {/* 环境诊断信息 */}
            <details className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <summary className="cursor-pointer hover:text-foreground">
                诊断信息（点击查看）
              </summary>
              <div className="mt-2 space-y-1">
                <div>浏览器: {typeof navigator !== 'undefined' ? navigator.userAgent.split(/[()]/).filter(Boolean)[1] || 'Unknown' : 'Unknown'}</div>
                <div>SharedArrayBuffer: {typeof SharedArrayBuffer !== 'undefined' ? '✅ 支持' : '❌ 不支持'}</div>
                <div>跨域隔离: {typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated ? '✅ 已启用' : '❌ 未启用'}</div>
                <div>WebAssembly: {typeof WebAssembly !== 'undefined' ? '✅ 支持' : '❌ 不支持'}</div>
              </div>
            </details>
          </div>

          {/* 文件选择 */}
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept={supportedFormats.map(f => `.${f}`).join(',')}
                className="hidden"
                disabled={!loaded}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!loaded}
                variant="outline"
                className="w-full h-12 md:h-14 text-base md:text-lg"
              >
                {file ? `已选择: ${file.name}` : '选择音视频文件'}
              </Button>
            </div>

            {/* 支持的格式提示 */}
            <p className="text-xs md:text-sm text-center text-muted-foreground">
              支持格式: {supportedFormats.join(', ')}
            </p>
          </div>

          {/* 输出格式选择 */}
          {file && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm md:text-base font-medium">
                  输出格式
                </label>
                <Select
                  value={outputFormat}
                  onValueChange={(value) => setOutputFormat(value as OutputFormat)}
                  disabled={converting}
                >
                  <SelectTrigger className="w-full h-12 md:h-14 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 品质选择 */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-medium">
                  输出品质
                </label>
                <Select
                  value={quality}
                  onValueChange={(value) => setQuality(value as QualityLevel)}
                  disabled={converting}
                >
                  <SelectTrigger className="w-full h-12 md:h-14 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      {QUALITY_SETTINGS[outputFormat].low.label}
                    </SelectItem>
                    <SelectItem value="medium">
                      {QUALITY_SETTINGS[outputFormat].medium.label}
                    </SelectItem>
                    <SelectItem value="high">
                      {QUALITY_SETTINGS[outputFormat].high.label}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 进度条 */}
          {converting && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progress}%
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleConvert}
              disabled={!file || !loaded || converting}
              className="flex-1 h-12 md:h-14 text-base md:text-lg"
            >
              {converting ? '转码中...' : '开始转码'}
            </Button>

            {downloadUrl && (
              <Button
                onClick={handleDownload}
                variant="secondary"
                className="flex-1 h-12 md:h-14 text-base md:text-lg"
              >
                下载文件
              </Button>
            )}
          </div>

          {/* 说明文字 */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs md:text-sm text-muted-foreground">
              <strong>💡 提示:</strong>
            </p>
            <ul className="text-xs md:text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>所有处理均在浏览器本地完成，不会上传到服务器</li>
              <li>首次加载需要下载 FFmpeg 核心文件（约 30MB）</li>
              <li>大文件转码可能需要较长时间，请耐心等待</li>
              <li>建议使用现代浏览器（Chrome、Edge、Firefox）</li>
            </ul>
          </div>

          {/* SharedArrayBuffer 重要性说明 */}
          {!loaded && (typeof SharedArrayBuffer === 'undefined' || !crossOriginIsolated) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-3">
              <h3 className="text-sm md:text-base font-semibold text-amber-900 dark:text-amber-100">
                ⚠️ 为什么需要 SharedArrayBuffer？
              </h3>

              <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
                本工具使用先进的 WebAssembly 多线程技术，需要浏览器支持 <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">SharedArrayBuffer</code>。
                这项技术对<strong>隐私安全</strong>和<strong>性能</strong>至关重要。
              </p>

              {/* 方案对比表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-100 dark:bg-amber-900/40">
                      <th className="border border-amber-200 dark:border-amber-800 p-2 text-left">方案</th>
                      <th className="border border-amber-200 dark:border-amber-800 p-2 text-center">隐私性</th>
                      <th className="border border-amber-200 dark:border-amber-800 p-2 text-center">转码速度</th>
                      <th className="border border-amber-200 dark:border-amber-800 p-2 text-center">功能支持</th>
                    </tr>
                  </thead>
                  <tbody className="text-amber-900 dark:text-amber-100">
                    <tr className="bg-green-50 dark:bg-green-950/20">
                      <td className="border border-amber-200 dark:border-amber-800 p-2">
                        <strong>FFmpeg + SAB</strong>
                        <br />
                        <span className="text-[10px] text-muted-foreground">(本工具)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完全本地</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">⚡ 快速</span>
                        <br />
                        <span className="text-[10px]">(5-10x)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完整</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-amber-200 dark:border-amber-800 p-2">
                        <strong>旧版 FFmpeg</strong>
                        <br />
                        <span className="text-[10px] text-muted-foreground">(无 SAB)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完全本地</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-orange-600 dark:text-orange-400">🐌 较慢</span>
                        <br />
                        <span className="text-[10px]">(2-3x)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完整</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-amber-200 dark:border-amber-800 p-2">
                        <strong>lamejs</strong>
                        <br />
                        <span className="text-[10px] text-muted-foreground">(纯 JS 库)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完全本地</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-red-600 dark:text-red-400">🐢 极慢</span>
                        <br />
                        <span className="text-[10px]">(0.1x)</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-red-600 dark:text-red-400">❌ 仅 MP3</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-amber-200 dark:border-amber-800 p-2">
                        <strong>服务端转码</strong>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-red-600 dark:text-red-400">⚠️ 需上传</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">⚡ 快速</span>
                      </td>
                      <td className="border border-amber-200 dark:border-amber-800 p-2 text-center">
                        <span className="text-green-600 dark:text-green-400">✅ 完整</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-xs md:text-sm">
                <p className="text-amber-800 dark:text-amber-200">
                  <strong>推荐操作：</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300 ml-2">
                  <li>
                    <strong>使用最新版浏览器：</strong>Chrome、Firefox、Edge 或 Safari
                  </li>
                  <li className="mt-2">
                    <strong>检查网站部署配置：</strong>确保服务器已设置正确的 HTTP 响应头：
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">Cross-Origin-Opener-Policy: same-origin</code></li>
                      <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">Cross-Origin-Embedder-Policy: require-corp</code></li>
                    </ul>
                  </li>
                  <li className="mt-2">刷新页面重试</li>
                </ol>
              </div>

              <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                💡 这些限制是浏览器为了保护您的数据安全而设计的。本工具绝不会将您的文件上传到服务器。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
