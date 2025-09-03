import fs from 'fs';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Load resume
const resumeContent = fs.readFileSync('Resume.txt', 'utf8');




// FETCH JOB POSTINGS AND SAVE TO job_postings.js ////////////////////////////////////
// const client = new ApifyClient({
//     token: process.env.APIFY_API_TOKEN,
// });
// (async () => {
//     // Run the Actor and wait for it to finish
//     const run = await client.actor("hKByXkMQaC5Qt9UMN").call({
//         "urls": [
//             "https://www.linkedin.com/jobs/search?keywords=Solutions%20Engineer&location=United%20States&geoId=103644278&f_JT=F&f_TPR=r604800&f_WT=2&f_SB2=5&position=1&pageNum=0"
//         ],
//         "scrapeCompany": true,
//         "count": 100
//     });

//     console.log('Fetching results from dataset...');
//     const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
//     // Write results to JSON file
//     const outputFile = 'job_postings.json';
//     fs.writeFileSync(outputFile, JSON.stringify(items, null, 2));
//     console.log(`Results saved to ${outputFile} (${items.length} items)`);
// })();

const jobData = JSON.parse(fs.readFileSync('job_postings.json', 'utf8'));

// Filter out jobs that don't have applyUrl OR jobPosterName (need at least one)
const validJobs = jobData.filter(job => {
    const hasValidApplyUrl = job.applyUrl && job.applyUrl.length > 0;
    const hasValidJobPoster = job.jobPosterName && job.jobPosterName.length > 0;
    return hasValidApplyUrl || hasValidJobPoster;
});

console.log(`Found ${validJobs.length} valid jobs out of ${jobData.length} total jobs`);

// Simple job analysis function
async function shouldApplyToJob(job) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a career advisor. Based on the candidate's resume and a job posting, determine if they should apply. Return your response as JSON with 'apply' (true/false) and 'reason' (explanation). Use 60%+ confidence threshold."
                },
                {
                    role: "user",
                    content: `RESUME: ${resumeContent}
                    
JOB POSTING:
Job Title: ${job.title}
Company: ${job.companyName}
Salary: ${job.salaryInfo} ${job.salary}
Job Description: ${job.descriptionText}
Seniority Level: ${job.seniorityLevel}
Job Function: ${job.jobFunction}

Should this candidate apply? Return JSON with format: {"apply": true/false, "reason": "explanation"}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 200
        });
        
        const result = JSON.parse(response.choices[0].message.content);
        return result;
    } catch (error) {
        console.error('Error analyzing job:', error);
        return { apply: false, reason: "Analysis failed due to technical error" };
    }
}

let jobArr = [];
const recommendedJobs = [];

// Process and analyze jobs 5-10 (indices 4-9)
for (let i = 4; i < Math.min(10, validJobs.length); i++){
    const job = validJobs[i];
    
    console.log(`\n🔍 Analyzing job ${i + 1}/10: ${job.title} at ${job.companyName}`);
    
    // Get AI recommendation
    const recommendation = await shouldApplyToJob(job);
    
    const jobString = `
        Job Title: ${job.title}
        Company: ${job.companyName}
        Salary: ${job.salaryInfo} ${job.salary}
        Seniority Level: ${job.seniorityLevel}
        Job Function: ${job.jobFunction}
        Apply URL: ${job.applyUrl}
        Posted by: ${job.jobPosterName}
        
        🤖 AI Recommendation: ${recommendation.apply ? '✅ APPLY' : '❌ SKIP'}
        💭 Reason: ${recommendation.reason}
    `;
    
    // Only log the essential info
    console.log(`${recommendation.apply ? '✅' : '❌'} ${recommendation.apply ? 'APPLY' : 'SKIP'} - ${recommendation.reason.substring(0, 100)}...`);
    
    // Store recommended jobs separately
    if (recommendation.apply) {
        recommendedJobs.push({
            title: job.title,
            company: job.companyName,
            salary: job.salary || job.salaryInfo,
            applyUrl: job.applyUrl,
            reason: recommendation.reason
        });
    }
}

// Summary
console.log(`\n📈 SUMMARY: ${recommendedJobs.length} jobs recommended out of ${Math.min(6, validJobs.length - 4)} analyzed`);

// Display recommended jobs
if (recommendedJobs.length > 0) {
    console.log('\n🎯 RECOMMENDED JOBS:');
    recommendedJobs.forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title} - ${job.company}`);
        console.log(`   Salary: ${job.salary || 'Not specified'}`);
        console.log(`   Apply: ${job.applyUrl || 'Contact recruiter'}`);
        console.log(`   Why: ${job.reason.substring(0, 200)}...`);
    });
}
