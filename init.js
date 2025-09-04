import fs from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { ApifyClient } from 'apify-client';
import { customizeResume } from './workflowElements/resumeCustomizer.js';

// Load environment variables
config();

// Initialize the ApifyClient with API token
// const client = new ApifyClient({
//     token: process.env.APIFY_API_TOKEN,
// });

// // Prepare Actor input
// const input = {
//     "urls": [
//         "https://www.linkedin.com/jobs/search?keywords=ai%20solutions%20engineer&location=United%20States&geoId=103644278&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0"
//     ],
//     "scrapeCompany": true,
//     "count": 100
// };

// await (async () => {
//     // Run the Actor and wait for it to finish
//     const run = await client.actor("hKByXkMQaC5Qt9UMN").call(input);

//     // Fetch Actor results from the run's dataset and save to JSON file
//     console.log('Saving results to job_postings.json');
//     const { items } = await client.dataset(run.defaultDatasetId).listItems();
//     fs.writeFileSync('job_postings.json', JSON.stringify(items, null, 2));
//     console.log(`Saved ${items.length} job postings to job_postings.json`);
// })();


// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Load resume and job data
const resumeContent = fs.readFileSync('Resume.txt', 'utf8');
const jobData = JSON.parse(fs.readFileSync('job_postings.json', 'utf8'));

// Simple AI job analysis
async function analyzeJob(job) {
    try {
        const salaryInfo = job.salaryInfo || job.salary || 'Not specified';
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.1, // Low temperature for consistent, deterministic output
            max_tokens: 500, // Increased for complete responses
            top_p: 0.9, // Focus on high-probability tokens
            frequency_penalty: 0.0, // No penalty for repetition in structured output
            presence_penalty: 0.0, // No penalty for mentioning topics multiple times
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are an expert career advisor specializing in AI and technical roles. Analyze job postings against candidate profiles with precision and provide structured recommendations. Always respond with valid JSON matching the specified schema."
                },
                {
                    role: "user", 
                    content: `
                    CANDIDATES PRIMARY MOTIVATIONS:
                    - Seeking a technical role that acts a bridge between technical and business functions. Solutioning, consulting, and client interaction are key aspects.
                    - Looking for a role in AI engineering that focuses on building and deploying AI-powered systems, candidate has no experience in machine learning model development.
                    - Prefers role to have a sales component to the job (with commission pay added to base salary), although not strictly required.
                    - Wants the highest salary possible, but is also open to roles that offer strong growth potential and learning opportunities.
                    - Prefers remote work but is open to hybrid or in-office roles if the listed salary is exceptional.
                    - Interested in roles that align with their skills in software development, project management, and team leadership.
                    
                    CANDIDATE STRENGTHS:
                    - Strong background in full stack software development, project management, and financial markets, python, javascript.
                    - Strong Artificial Intelligence experience, building AI automation workflows, Retrieval-Augmented Generation (RAG) systems, and custom GPT applications.
                    - Amazon Web Services (AWS) certified solutions architect.
                    - Proven leadership skills with experience managing teams.
                    - Excellent communication skills, enabling effective collaboration with both technical and non-technical stakeholders.
                    - Strong problem-solving abilities, with a track record of delivering innovative solutions.
                    - Adaptable and quick to learn new technologies and methodologies.


                    RESUME:
                    ${resumeContent}

                    JOB TO ANALYZE:
                    Title: ${job.title}
                    Company: ${job.companyName}
                    Salary: ${salaryInfo}
                    Description: ${job.descriptionText}

                    Provide a recommendation using this exact JSON schema:
                    {
                    "apply": boolean,
                    "reason": "2-3 sentence explanation focusing on role alignment and key factors",
                    "jobDescription": "2 sentence summary of core responsibilities and requirements", 
                    "salary": "salary information or compensation details"
                    }`
                }
            ]
        });
        
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error(`Error analyzing job: ${error.message}`);
        return {
            apply: false,
            reason: "Error occurred during analysis - unable to process job details",
            jobDescription: "Technical analysis failed due to processing error",
            salary: job.salaryInfo || job.salary || 'Not specified'
        };
    }
}

// Main execution
async function main() {
    const validJobs = jobData.filter(job => (job.applyUrl && job.applyUrl.trim() !== '') || (job.jobPosterName && job.jobPosterName.trim() !== ''));
    console.log(`Found ${validJobs.length} valid jobs out of ${jobData.length} total jobs that meet the criteria`);
    
    for (let i = 0; i < 10; i++) {
        const job = validJobs[i];
        
        // Skip jobs without valid applyUrl or jobPosterName
        if ((!job.applyUrl || job.applyUrl.trim() === '') && 
            (!job.jobPosterName || job.jobPosterName.trim() === '')) {
            console.log(`\n${i + 1}. ${job.title} - ${job.companyName} [SKIPPED - No apply URL or poster name]`);
            continue;
        }
        
        console.log(`\n${i + 1}. ${job.title} - ${job.companyName}`);
        console.log(`   Salary: ${job.salaryInfo || job.salary || 'Not specified'}`);
        
        const result = await analyzeJob(job);
        console.log(`   Apply: ${result.apply ? '✅ YES' : '❌ NO'}`);
        console.log(`   Job URL: ${job.applyUrl || 'Not specified'}`);
        console.log(`   Poster name: ${job.jobPosterName || 'Not specified'}`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Summary: ${result.jobDescription}`);

        // If the job is recommended, proceed with resume customization
        if (result.apply === true) {
            const jobDetails = {
                title: job.title,
                companyName: job.companyName,
                descriptionText: job.descriptionText,
                jobFunction: job.jobFunction,
                industries: job.industries,
                companyDescription: job.companyDescription,
            };
            
            console.log(`   🎯 Customizing resume for this position...`);
            const customResumeResult = await customizeResume(jobDetails, resumeContent, openai);
            console.log(`   🎯 Resume Customizing DONE`);
            if (customResumeResult.success) {
                console.log(`   🎯 Resume Customizing DONE`);
            } else {
                console.log(`   ❌ Resume customization failed: ${customResumeResult.message}`);
            }
        }
        
    }
}

main().catch(console.error);
