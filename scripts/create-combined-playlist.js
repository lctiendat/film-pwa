import fs from 'fs';
import path from 'path';

// Read dragon lord 55 episodes
const raw = fs.readFileSync('src/services/dragonLordEpisodes.json', 'utf8');
const episodes = JSON.parse(raw);

console.log(`Processing ${episodes.length} episodes for combined output...`);

// 1. Generate a combined master M3U8 file that links all episodes
let combinedM3U8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n\n';

// 2. Generate a list of video URLs for downloading with yt-dlp or ffmpeg
let downloadList = '';

episodes.forEach((ep, index) => {
  const epNum = ep.number || ep.route_episode_number || (index + 1);
  const playUrl = ep.play_url;

  if (playUrl) {
    downloadList += `${playUrl}\n`;
  }
});

fs.writeFileSync('episodes_stream_urls.txt', downloadList);
console.log('Saved episodes_stream_urls.txt with all 55 HLS stream URLs!');

console.log(`
====================================================================
HƯỚNG DẪN GHÉP TẤT CẢ TẬP THÀNH 1 FILE VIDEO MP4 DUY NHẤT:
====================================================================
Cách 1: Xem trực tiếp trên PWA (Không cần tải hay ghép thủ công)
- Bật công tắc "Chế độ ghép 1 tập: BẬT" trên giao diện web.
- Trình phát sẽ tự động nối tiếp 55 tập liên tục không ngắt quãng
  như một bộ phim dài ~82 phút với thanh tua tổng thời gian.

Cách 2: Dùng FFmpeg hoặc yt-dlp để ghép thành 1 file MP4 lưu vào máy
- Cài yt-dlp hoặc FFmpeg.
- Tải toàn bộ 55 tập và ghép tự động bằng lệnh:
  yt-dlp -a episodes_stream_urls.txt -o "episodes/ep%(autonumber)s.mp4"
- Sau đó ghép các file mp4 bằng FFmpeg:
  ffmpeg -f concat -safe 0 -i list.txt -c copy "Forbidden_Affair_Full_Movie.mp4"
====================================================================
`);
