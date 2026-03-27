async function main() {
  const slug = 'huitu-fest-2026';
  const url = `http://localhost:3000/api/events/${slug}/config`;
  
  try {
     const getRes = await fetch(url);
     const config = await getRes.json();
     
     // Change rule title
     if (!config.rules) config.rules = {};
     config.rules.sectionTitle = 'QUY ĐỊNH (TEST)';
     config.rules.content = 'Nội dung mới từ fetch script';
     
     console.log('Sending PUT update...');
     const putRes = await fetch(url, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(config)
     });
     
     console.log('Update Status:', putRes.status);
     const resData = await putRes.json();
     console.log('Response:', JSON.stringify(resData, null, 2));
  } catch (e) {
     console.log('Error:', e.message);
  }
}
main();
