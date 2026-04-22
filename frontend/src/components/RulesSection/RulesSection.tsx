import styles from './RulesSection.module.css';

interface RuleItem {
  id?: number;
  title: string;
  content: string;
}

interface RulesSectionProps {
  title?: string;
  items?: RuleItem[];
}

export default function RulesSection({ title = "QUY ĐỊNH CHUNG", items = [] }: RulesSectionProps) {
  const displayTitle = title;
  const rules = items.length > 0 ? items : [
    {
      title: "Vé và check-in:",
      content: "BTC sẽ kiểm duyệt thông tin đăng ký vé hợp lệ và gửi vé qua email cho bạn trong vòng 48h sau khi đăng ký. Vui lòng kiểm tra các hộp thư. Vé không có giá trị thương mại. BTC có quyền từ chối người tham dự nếu phát hiện tình trạng bán vé."
    },
    {
      title: "Thời gian check-in:",
      content: "Người tham dự cần check-in đúng khung giờ (15h30 – 17h30 ngày 22/03/2026). BTC không giải quyết các trường hợp check-in sau thời gian đóng cổng."
    },
    {
      title: "Trách nhiệm về sức khỏe:",
      content: "Người tham dự tự cân nhắc và chịu trách nhiệm về tình trạng sức khỏe của bản thân khi tham gia chương trình."
    },
    {
      title: "Bảo vệ môi trường:",
      content: "Không xả rác bừa bãi trong khu vực tổ chức sự kiện. Không gây thiệt hại hoặc trộm cắp tài sản trong khuôn viên chương trình."
    },
    {
      title: "Tài sản cá nhân:",
      content: "Người tham dự tự bảo quản tài sản cá nhân. BTC không chịu trách nhiệm đối với các trường hợp thất lạc hoặc mất tài sản."
    },
    {
      title: "Quyền sử dụng hình ảnh:",
      content: "Khi tham gia sự kiện, người tham dự đồng ý để hình ảnh của mình được sử dụng trong các sản phẩm truyền thông của chương trình."
    },
    {
      title: "Tuân thủ hướng dẫn:",
      content: "Cần tuân thủ hướng dẫn từ BTC và an ninh. BTC có quyền yêu cầu rời khỏi khu vực nếu có hành vi quá khích, sử dụng chất kích thích hoặc mang thiết bị nguy hiểm."
    }
  ];

  return (
    <section className={styles.section} id="rules">
      <div className={styles.container}>
        <div className={styles.glassCard}>
          <h2 className={styles.heading}>{displayTitle}</h2>

          <div className={styles.rulesList}>
            {rules.map((rule, index) => (
              <div key={index} className={styles.ruleItem}>

                <div className={styles.ruleText}>
                  <h4 className={styles.ruleTitle}>{rule.title}</h4>
                  <p className={styles.ruleContent}>{rule.content}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
