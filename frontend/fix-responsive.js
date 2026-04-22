const fs = require('fs');
const css = {
  'src/components/Hero/Hero.module.css': `
@media (max-width: 1024px) {
  .title { font-size: 3rem !important; }
  .subtitle { font-size: 1.1rem !important; }
}
@media (max-width: 767px) {
  .hero { height: auto !important; min-height: 100vh !important; display: flex; align-items: center; padding: 60px 0; }
  .title { font-size: 2rem !important; line-height: 1.2 !important; }
  .subtitle { font-size: 1rem !important; margin-bottom: 1.5rem !important; }
  .ctaButton { padding: 0.8rem 1.8rem !important; font-size: 0.9rem !important; }
}`,
  'src/components/AboutSection/AboutSection.module.css': `
@media (max-width: 1024px) {
  .title { font-size: 36px !important; }
  .text { font-size: 16px !important; }
}
@media (max-width: 767px) {
  .section { padding: 40px 0 !important; }
  .grid { grid-template-columns: 1fr !important; gap: 20px !important; text-align: center; }
  .title { font-size: 28px !important; }
  .text { font-size: 15px !important; }
}`,
  'src/components/ArtistSection/ArtistSection.module.css': `
@media (max-width: 1024px) {
  .heading { font-size: 30px !important; }
  .card { width: clamp(160px, 30vw, 220px) !important; }
}
@media (max-width: 767px) {
  .section { padding: 30px 0 !important; }
  .heading { font-size: 26px !important; }
  .strip { flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; gap: 15px !important; }
  .card { width: calc(50% - 15px) !important; }
  .detail { padding: 20px !important; margin-top: 15px !important; }
  .detailHead h4 { font-size: 22px !important; }
  .status { font-size: 12px !important; padding: 6px 15px !important; }
  .name { font-size: 13px !important; }
}
@media (max-width: 480px) {
  .card { width: 100% !important; max-width: 260px !important; margin: 0 auto !important; }
}`,
  'src/components/TalentSection/TalentSection.module.css': `
@media (max-width: 1024px) {
  .heading { font-size: 30px !important; }
  .card { width: clamp(160px, 30vw, 220px) !important; }
}
@media (max-width: 767px) {
  .section { padding: 30px 0 !important; }
  .heading { font-size: 26px !important; }
  .strip { flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; gap: 15px !important; }
  .card { width: calc(50% - 15px) !important; }
  .name { font-size: 13px !important; }
}
@media (max-width: 480px) {
  .card { width: 100% !important; max-width: 260px !important; margin: 0 auto !important; }
}`,
  'src/components/TimelineSection/TimelineSection.module.css': `
@media (max-width: 767px) {
  .heading { font-size: 26px !important; }
  .timeline { padding: 0 10px !important; }
  .item { flex-direction: column !important; align-items: flex-start !important; text-align: left !important; gap: 10px !important; }
  .time { width: 100% !important; text-align: left !important; font-size: 18px !important; margin-bottom: 5px !important; }
  .content { width: 100% !important; padding: 15px !important; }
  .centerDot { display: none !important; }
}`,
  'src/components/RegistrationForm/RegistrationForm.module.css': `
@media (max-width: 767px) {
  .formGrid { grid-template-columns: 1fr !important; gap: 15px !important; }
}
@media (max-width: 480px) {
  .title { font-size: 24px !important; }
  .modal { padding: 30px 20px !important; border-radius: 16px !important; }
  .field input, .select, .dateInput { padding: 12px 15px !important; font-size: 14px !important; }
}`,
  'src/components/Footer/Footer.module.css': `
@media (max-width: 767px) {
  .container { flex-direction: column !important; text-align: center !important; gap: 20px !important; }
  .links { flex-direction: column !important; gap: 10px !important; align-items: center !important; }
}`
};

Object.keys(css).forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('/* ADDED RESPONSIVE FIXES */')) {
      fs.writeFileSync(file, content + '\n/* ADDED RESPONSIVE FIXES */' + css[file]);
      console.log('Updated ' + file);
    }
  }
});
