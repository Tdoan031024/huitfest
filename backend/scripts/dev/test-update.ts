import axios from 'axios';

async function main() {
  const slug = 'huitu-fest-2026';
  const url = `http://localhost:3000/api/events/${slug}/config`;
  
  // 1. Get current config
  const res = await axios.get(url);
  const config = res.data;
  
  // 2. Add an item
  config.journey.items.push({
    title: 'Testing new item',
    description: 'Testing description',
    image: ''
  });
  
  // 3. Save (needs Admin token? No, let's see if we can do it locally OR if I can bypass it for test)
  // Actually I'll just use the service directly in a script if I have access to prisma.
}
main();
