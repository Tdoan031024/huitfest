import { BASE_IMAGE_URL } from '@/lib/api';
import styles from './JourneySection.module.css';

interface JourneyItem {
  id?: number | string;
  title: string;
  content: string;
  image?: string;
}

interface JourneySectionProps {
  items?: JourneyItem[];
  title?: string;
}

export default function JourneySection({ items = [], title = "HÀNH TRÌNH HUIT FEST" }: JourneySectionProps) {
  // Fallback to default items if none provided
  const displayItems = items.length > 0 ? items : [
    {
      title: 'KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG',
      content: 'Không gian âm nhạc ngoài trời với sức nóng của mùa hè và nhiệt huyết tuổi trẻ!',
      image: '/assets/images/banner/hanhtrinh2.webp'
    },
    {
      title: 'GẶP GỠ LOẠT IDOLS ĐÌNH ĐÁM',
      content: 'Cháy hết mình cùng dàn line-up xịn sò ngay tại sân khấu HUIT Fest: Noo Phước Thịnh, Tăng Duy Tân, MONO, Orange...',
      image: '/assets/images/banner/banner.webp'
    }
  ];

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/assets/images/banner/hanhtrinh2.webp";
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) return imagePath;
    return imagePath.startsWith('/') ? `${BASE_IMAGE_URL}${imagePath}` : imagePath;
  };

  return (
    <section className={styles.section} id="journey">
      <div className={styles.container}>
        <h2 className={styles.heading}>{title}</h2>

        <div className={styles.content}>
          {displayItems.map((item, index) => (
            <div key={index} className={`${styles.item} ${index % 2 !== 0 ? styles.reverse : ''}`}>
              <div className={styles.imageWrap}>
                <img 
                  src={getImageUrl(item.image)} 
                  alt={item.title} 
                  className={styles.image}
                />
              </div>
              <div className={styles.text}>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <p className={styles.itemDesc}>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
