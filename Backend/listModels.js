import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const apiKey = process.env.GEMINI_API_KEY;
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
  .then(res => res.json())
  .then(data => {
    data.models.forEach(m => console.log(m.name));
  })
  .catch(err => console.error(err));
