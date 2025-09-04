import fs from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Load resume and job data
const resumeContent = fs.readFileSync('Resume.txt', 'utf8');
const jobData = JSON.parse(fs.readFileSync('job_postings.json', 'utf8'));

// Simple AI job analysis
async function analyzeJob(job) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
            role: "user",
            content: `Resume: ${resumeContent}\n\nJob: ${job.title} at ${job.companyName}\n${job.descriptionText}\n\nShould apply? Return JSON: {"apply": true/false, "reason": "brief explanation"}`
        }],
        response_format: { type: "json_object" },
        max_tokens: 150
    });
    return JSON.parse(response.choices[0].message.content);
}

// Main execution
async function main() {
    const validJobs = jobData.filter(job => job.applyUrl || job.jobPosterName);
    console.log(`Analyzing ${Math.min(5, validJobs.length)} jobs...\n`);
    
    for (let i = 0; i < Math.min(5, validJobs.length); i++) {
        const job = validJobs[i];
        console.log(`${i + 1}. ${job.title} - ${job.companyName}`);
        
        const result = await analyzeJob(job);
        console.log(`   ${result.apply ? '✅ APPLY' : '❌ SKIP'}: ${result.reason}\n`);
    }
}

main().catch(console.error);
