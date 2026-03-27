import axios from 'axios';

async function main() {
  const url = 'http://localhost:3000/api/events/huitu-fest-2026/config';
  try {
    const res = await axios.put(url, { test: 'data' });
    console.log('Success:', res.status);
  } catch (e: any) {
    console.log('Error:', e.response?.status, e.response?.data);
  }
}
main();
