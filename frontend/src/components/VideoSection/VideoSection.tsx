import styles from './VideoSection.module.css';

interface VideoSectionProps {
  videoUrl?: string | null;
  title?: string;
}

export default function VideoSection({ videoUrl, title }: VideoSectionProps) {
  // Hàm xử lý link Video (Hỗ trợ Youtube và Facebook)
  const getVideoEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null;

    let targetUrl = url.trim();

    // 0. Xử lý nếu là mã <iframe>
    if (targetUrl.includes('<iframe')) {
      const srcMatch = targetUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        targetUrl = srcMatch[1];
      }
    }

    // 1. Kiểm tra Youtube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = targetUrl.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}`;
    }

    // 2. Kiểm tra Facebook
    if (targetUrl.includes('facebook.com')) {
      if (targetUrl.includes('plugins/video.php')) return targetUrl;
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(targetUrl)}&show_text=0&width=560`;
    }

    // 3. Nếu là link embed sẵn
    if (targetUrl.includes('embed') || targetUrl.includes('plugins/')) return targetUrl;

    return null;
  };

  const embedUrl = getVideoEmbedUrl(videoUrl);
  const displayTitle = title || 'VIDEO SỰ KIỆN';

  if (!videoUrl && !embedUrl) return null;

  return (
    <section className={styles.section} id="video">
      <div className={styles.container}>
        <h2 className={styles.heading}>{displayTitle}</h2>
        <div className={styles.videoWrapper}>
          <div className={styles.responsiveVideo}>
            <iframe
              src={embedUrl || videoUrl || ''}
              width="100%" 
              height="100%" 
              style={{ border: 'none', borderRadius: '12px', overflow: 'hidden' }} 
              frameBorder="0"
              scrolling="no"
              allowFullScreen={true} 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
