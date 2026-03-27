import axios from 'axios';

async function main() {
  const slug = 'huitu-fest-2026';
  const url = `http://localhost:3000/api/events/${slug}/config`;
  
  try {
     const response = await axios.get(url);
     const config = response.data;
     
     // Change rule title
     config.rules.sectionTitle = 'QUY ĐỊNH (UPDATE)';
     config.rules.content = 'Nội dung mới từ script';
     
     console.log('Sending update...');
     const updateRes = await axios.put(url, config, {
       // We might need a token if AdminGuard is active
       // But usually in dev it might be bypassed or using cookie
     });
     console.log('Update success:', updateRes.status);
  } catch (e: any) {
     console.log('Error:', e.response?.status, e.response?.data);
  }
}
main();
