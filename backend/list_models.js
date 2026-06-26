import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is not defined in your backend/.env file.");
    console.log("Please define it in backend/.env to list authorized models.");
    process.exit(1);
  }

  console.log("🔗 Connecting to Gemini API...");
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${response.statusText})`);
    }
    
    const data = await response.json();
    
    console.log("\n==================================================");
    console.log("🤖 AUTHORIZED GEMINI MODELS FOR YOUR API KEY:");
    console.log("==================================================");
    
    const supportedModels = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );
    
    supportedModels.forEach(m => {
      const cleanName = m.name.replace('models/', '');
      console.log(` 👉 ${cleanName}`);
    });
    
    console.log("==================================================");
    console.log("\n💡 TROUBLESHOOTING TIP:");
    console.log("If 'gemini-1.5-flash' is not listed or throws errors, add the following line");
    console.log("to your backend/.env file, replacing with one of the authorized model names above:");
    console.log("   GEMINI_MODEL=gemini-1.5-pro   (or another listed model)");
    console.log("==================================================\n");
  } catch (error) {
    console.error("❌ Failed to retrieve models:", error.message);
    console.log("Verify that your GEMINI_API_KEY is valid and has not expired.");
  }
}

run();
