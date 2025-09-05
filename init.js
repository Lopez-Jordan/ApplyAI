import fs from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { ApifyClient } from 'apify-client';
import { customizeResume } from './workflowElements/resumeCustomizer.js';
import { filterJobsWithPosterNames, DetermineIfApply } from './workflowElements/analyzeJobPostings.js';
import { findEmailPerson } from './workflowElements/EmailJobPoster.js';

config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// // Run the Apify Actor to scrape job postings from LinkedIn
// await (async () => {
//     const run = await client.actor("hKByXkMQaC5Qt9UMN").call({
//     "urls": [
//         "https://www.linkedin.com/jobs/search?keywords=ai%20solutions%20engineer&location=United%20States&geoId=103644278&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0"
//     ],
//     "scrapeCompany": true,
//     "count": 100
// });

//     // Fetch Actor results from the run's dataset and save to JSON file
//     console.log('Saving results to job_postings.json');
//     const { items } = await client.dataset(run.defaultDatasetId).listItems();
//     fs.writeFileSync('job_postings.json', JSON.stringify(items, null, 2));
//     console.log(`Saved ${items.length} job postings to job_postings.json`);
// })();




// Load resume and job data
console.log('📁 Loading data files...');
const resumeContent = fs.readFileSync('Resume.txt', 'utf8');
const jobData = JSON.parse(fs.readFileSync('job_postings.json', 'utf8'));
console.log(`   Loaded resume and ${jobData.length} job postings`);

async function main() {
    console.log('🚀 Starting AI Job Analysis System...\n');
    
    // Step 1: Filter jobs to only include those with jobPosterName
    const validJobs = filterJobsWithPosterNames(jobData);
    
    // Step 2: (True / False) Determine if a job should be applied to
    const jobResults = await DetermineIfApply(validJobs, resumeContent, openai);
    
    
    let customizedResumesCount = 0;
    for (const result of jobResults) {
        if (result.analysis.apply === true) {
            
            // Step 3: Find out the email of the job poster
            console.log(result.job.jobPosterName + " " + result.job.companyName);
            // findEmailPerson(result.jobPosterName, "John Doe");

            // Step 4: Customize resume for the recommended job
            console.log(`\n📝 Customizing resume for: ${result.job.title} at ${result.job.companyName}`);
            
            const customResumeResult = await customizeResume({
                title: result.job.title,
                companyName: result.job.companyName,
                descriptionText: result.job.descriptionText,
                jobFunction: result.job.jobFunction,
                industries: result.job.industries,
                companyDescription: result.job.companyDescription,
            }, resumeContent, openai);

            if (customResumeResult.success) {
                customizedResumesCount++;
                console.log(`   ✅ Resume customized successfully`);
                console.log(`   📁 Saved to: ${customResumeResult.resumeFilePath}`);
            } else {
                console.log(`   ❌ Resume customization failed: ${customResumeResult.message}`);
            }
        }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total jobs analyzed: ${jobResults.length}`);
    console.log(`Jobs recommended: ${jobResults.filter(r => r.analysis.apply).length}`);
    console.log(`Resumes customized: ${customizedResumesCount}`);
}

main().catch(console.error);

// findEmailPerson("microsoft.com", "John Doe");