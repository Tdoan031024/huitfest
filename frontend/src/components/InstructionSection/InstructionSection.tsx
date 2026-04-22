'use client';
import styles from './InstructionSection.module.css';
import { useSiteConfig } from '@/context/SiteConfigContext';

interface InstructionItem {
  id?: number;
  title: string;
  content: string;
}

interface InstructionSectionProps {
  sectionTitle?: string;
  notes?: string[];
  items?: InstructionItem[];
}

export default function InstructionSection({ 
  sectionTitle = 'CÁCH THỨC NHẬN VÉ',
  notes = [],
  items = [] 
}: InstructionSectionProps) {
  const { config } = useSiteConfig();
  // Safe handling of null/undefined from props
  const safeItems = items || [];
  const safeNotes = notes || [
    'Sau khi hoàn thành đầy đủ các bước, bạn sẽ nhận được vé điện tử từ Ban Tổ Chức qua email để tham gia sự kiện.',
    'Vé tham gia hoàn toàn miễn phí.'
  ];
  const safeTitle = sectionTitle || 'CÁCH THỨC NHẬN VÉ';

  // If no items provided, we can still show the default ones
  const displayItems = safeItems.length > 0 ? safeItems : [
    {
      title: 'CHIA SẺ BÀI VIẾT',
      content: 'Chia sẻ bài viết trên Facebook cá nhân của bạn ở chế độ công khai (Public).'
    },
    {
      title: 'TAG BẠN BÈ',
      content: 'Tag 03 người bạn tại phần bình luận của bài viết để tham gia chương trình.'
    },
    {
      title: 'ĐIỀN FORM ĐĂNG KÝ',
      content: 'Điền form đăng ký bên dưới để nhận vé của chương trình.'
    }
  ];

  const defaultIcons = [
    "/assets/images/animation/s400x400__ngoi-sao-20260313160256-qnpia.png",
    "/assets/images/animation/s400x400__not-nhac-20260313160258-jl90w.png",
    "/assets/images/animation/s400x400__cai-cuc-20260313160256-j1z3r.png"
  ];

  return (
    <section className={styles.section} id="instructions">
      <div className={styles.container}>

        <h2 className={styles.heading}>{safeTitle.toUpperCase()}</h2>

        <div className={styles.grid}>
          {displayItems.map((item, index) => {
            const iconUrl = defaultIcons[index % defaultIcons.length];
            
            return (
              <div key={index} className={styles.stepCard}>
                <img 
                  src={iconUrl} 
                  alt="Icon" 
                  className={styles.stepIcon} 
                />
                <div className={styles.stepBox}>
                  <h4 className={styles.stepTitle}>
                    {item.title.toUpperCase().startsWith('BƯỚC') ? item.title : `BƯỚC ${index + 1}: ${item.title}`}
                  </h4>
                  <p className={styles.stepText}>
                    {item.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {safeNotes.length > 0 && (
          <div className={styles.note}>
            <h5 className={styles.noteTitle}>LƯU Ý</h5>
            <ul className={styles.noteList}>
              {safeNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {config.registrationOpen && (
          <div className={styles.action}>
            <a href="#register" className={styles.btn}>
              ĐĂNG KÝ VÉ NGAY
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

