import fs from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { ApifyClient } from 'apify-client';

// Load environment variables
config();

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Prepare Actor input
const input = {
    "urls": [
        "https://www.linkedin.com/jobs/search?keywords=ai%20solutions%20engineer&location=United%20States&geoId=103644278&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0"
    ],
    "scrapeCompany": true,
    "count": 100
};

(async () => {
    // Run the Actor and wait for it to finish
    const run = await client.actor("hKByXkMQaC5Qt9UMN").call(input);

    // Fetch Actor results from the run's dataset and save to JSON file
    console.log('Saving results to job_postings.json');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    fs.writeFileSync('job_postings.json', JSON.stringify(items, null, 2));
    console.log(`Saved ${items.length} job postings to job_postings.json`);
})();


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
            messages: [{
                role: "user",
                content: `
                You are an expert career advisor. Given the resume and job description below, determine if the candidate should apply for the job.

                The candidate's primary motivations include:
                - Seeking a technical role that acts a bridge between technical and business functions. Solutioning, consulting, and client interaction are key aspects.
                - Looking for a role in AI engineering that focuses on building and deploying AI-powered systems, rather than only machine learning model development.
                - Would potentially have a sales component to the job (with commission pay added to base salary), although not strictly required.
                - Wants the highest salary possible, but is also open to roles that offer strong growth potential and learning opportunities.
                - Prefers remote work but is open to hybrid or in-office roles if the opportunity is exceptional.
                - Interested in roles that align with their skills in software development, project management, and team leadership.
                
                Candidate Strengths:
                - Strong background in full stack software development, project management, and financial markets.
                - Strong Artificial Intelligence experience, building AI automation workflows, Retrieval-Augmented Generation (RAG) systems, and custom GPT applications.
                - Amazon Web Services (AWS) certified solutions architect.
                - Proven leadership skills with experience managing teams.
                - Excellent communication skills, enabling effective collaboration with both technical and non-technical stakeholders.
                - Strong problem-solving abilities, with a track record of delivering innovative solutions.
                - Adaptable and quick to learn new technologies and methodologies.

                Resume: ${resumeContent}
                
                Job: ${job.title} at ${job.companyName}
                ${job.descriptionText}
                
                Salary: ${salaryInfo}
                
                Return JSON with the following schema:
                {
                    "apply": true,
                    "reason": "brief explanation",
                    "jobDescription": "2 sentence summary",
                    "salary": "salary information"
                }
                `
            }],
            response_format: { type: "json_object" },
            max_tokens: 300
        });
        
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error(`Error analyzing job: ${error.message}`);
        return {
            apply: false,
            reason: "Error occurred during analysis",
            jobDescription: "Unable to analyze",
            salary: job.salaryInfo || job.salary || 'Not specified'
        };
    }
}

// Main execution
async function main() {
    const validJobs = jobData.filter(job => (job.applyUrl && job.applyUrl.trim() !== '') || (job.jobPosterName && job.jobPosterName.trim() !== ''));
    console.log(`Found ${validJobs.length} valid jobs out of ${jobData.length} total jobs that meet the criteria`);
    
    for (let i = 0; i < Math.min(10, validJobs.length); i++) {
        const job = validJobs[i];
        console.log(`\n${i + 1}. ${job.title} - ${job.companyName}`);
        console.log(`   Salary: ${job.salaryInfo || job.salary || 'Not specified'}`);
        
        const result = await analyzeJob(job);
        console.log(`   Apply: ${result.apply ? '✅ YES' : '❌ NO'}`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Summary: ${result.jobDescription}`);
    }
}

main().catch(console.error);
