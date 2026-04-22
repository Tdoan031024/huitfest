import Navbar from '@/components/Navbar/Navbar';
import Hero from '@/components/Hero/Hero';
import AboutSection from '@/components/AboutSection/AboutSection';
import ArtistSection from '@/components/ArtistSection/ArtistSection';
import TalentSection from '@/components/TalentSection/TalentSection';
import TimelineSection from '@/components/TimelineSection/TimelineSection';
import Countdown from '@/components/Countdown/Countdown';
import InstructionSection from '@/components/InstructionSection/InstructionSection';
import JourneySection from '@/components/JourneySection/JourneySection';
import VideoSection from '@/components/VideoSection/VideoSection';
import RulesSection from '@/components/RulesSection/RulesSection';
import RegistrationForm from '@/components/RegistrationForm/RegistrationForm';
import Footer from '@/components/Footer/Footer';
import { getCurrentEvent } from '@/lib/api';

const MOCK_AGENDA = [
  { id: '1', time: '14:00', title: 'Checkin', description: 'Cổng check-in fanzone sẽ đóng vào lúc 16:00' },
  { id: '2', time: '17:00 - 17:30', title: 'Khuấy động', description: 'Giao lưu và khuấy động không khí cùng khán giả' },
  { id: '3', time: '17:30 - 19:30', title: 'Văn nghệ', description: 'Tiết mục văn nghệ đặc sắc từ học sinh THPT và sinh viên HUIT' },
  { id: '4', time: '19:30 - 22:00', title: 'Tương tác nghệ sĩ', description: 'Giao lưu, tương tác với nghệ sĩ khách mời của chương trình' }
];

const MOCK_ARTISTS = [
  { id: 'a1', name: 'HIEUTHUHAI', description: 'Nam rapper điển trai và tài năng, "ông hoàng" bảng xếp hạng với những bản hit đình đám.', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop' },
  { id: 'a2', name: 'MONO', description: 'Tân binh quái vật của làng nhạc Việt với phong cách trình diễn cuốn hút và gu âm nhạc độc đáo.', image: 'https://images.unsplash.com/photo-1525672325345-9e672f7ed935?q=80&w=1974&auto=format&fit=crop' },
  { id: 'a3', name: 'BINZ', description: 'The BigcityBoy với những bản rap love ngọt ngào và phong cách chất lừ đặc trưng.', image: 'https://images.unsplash.com/photo-1520127873582-748995a82897?q=80&w=2070&auto=format&fit=crop' },
  { id: 'a4', name: 'SUBOI', description: 'Nữ hoàng Rap Việt, người mang tinh hoa của hip-hop Việt Nam vươn tầm quốc tế.', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop' },
  { id: 'a5', name: 'JUSTATEE', description: 'Ông hoàng Melody với khả năng tạo beat đỉnh cao và giọng hát truyền cảm đầy phong cách.', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop' }
];

const MOCK_TALENTS = [
  { id: 't1', name: 'CLB Dance HUIT', description: 'Đội nhảy hiện đại với những bước nhảy điêu luyện và năng lượng bùng nổ trên sân khấu.', image: 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=2070&auto=format&fit=crop' },
  { id: 't2', name: 'CLB Guitar HUIT', description: 'Nơi hội tụ những tiếng đàn lãng mạn và những bản ballad ngọt ngào từ các "nghệ sĩ" sinh viên.', image: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?q=80&w=2070&auto=format&fit=crop' },
  { id: 't3', name: 'CLB Vocal HUIT', description: 'Tập hợp những giọng ca đầy nội lực, sẵn sàng chinh phục mọi cung bậc cảm xúc của khán giả.', image: 'https://images.unsplash.com/photo-1516726817505-f5ed174301bd?q=80&w=2070&auto=format&fit=crop' },
  { id: 't4', name: 'CLB Magic HUIT', description: 'Những màn ảo thuật ảo diệu, đầy bất ngờ khiến người xem không thể rời mắt.', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=2070&auto=format&fit=crop' }
];

export default async function Home() {
  const event = await getCurrentEvent();

  if (!event) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: '#0b0424' }}>
        <p>Đang tải thông tin sự kiện... Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  // Use backend agenda if available, otherwise use mock data
  const agenda = (event.agenda && event.agenda.length > 0) ? event.agenda : MOCK_AGENDA;

  return (
    <main>
      
      <Hero />
      
      <AboutSection 
        title={event.name} 
        description={event.description} 
        logo={event.heroImage || ''}
      />

      <ArtistSection 
        artists={(event.artists?.artists && event.artists.artists.length > 0) ? event.artists.artists : MOCK_ARTISTS} 
        title={event.artists?.title || 'DANH SÁCH NGHỆ SĨ'}
      />
      
      <TalentSection 
        talents={((event.artistsExtra?.artists && event.artistsExtra.artists.length > 0) ? event.artistsExtra.artists : MOCK_TALENTS)
          .map((item) => ({
            ...item,
            id: String(item.id),
            image: item.image || '',
          }))}
        title={event.artistsExtra?.title || 'DẤU ẤN TÀI NĂNG'}
      />
      
      <Countdown targetDate={event.startAt} title={event.subtitle} />

      <InstructionSection 
        sectionTitle={event.instructions?.sectionTitle}
        notes={event.instructions?.notes}
        items={event.instructions?.items} 
      />

      <TimelineSection 
        agenda={agenda} 
        sectionTitle={event.timeline?.sectionTitle}
        bannerImage={event.timeline?.bannerImage}
      />

      <JourneySection 
        items={event.journey?.items} 
        title={event.journey?.sectionTitle || event.journey?.title}
      />

      <VideoSection 
        videoUrl={event.videoUrl} 
        title={(event as any).videoSection?.title} 
      />

      <RulesSection 
        title={event.rules?.sectionTitle} 
        items={event.rules?.items} 
      />

      <RegistrationForm />

      <Footer />
    </main>
  );
}
