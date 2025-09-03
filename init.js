import fs from 'fs';
import { ApifyClient } from 'apify-client';




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

let jobArr = [];

// Process only the first 5 valid jobs
for (let i = 0; i < Math.min(5, validJobs.length); i++){
    const job = validJobs[i];
    
    const jobString = `
        Job Title: ${job.title},
        Company: ${job.companyName},
        Salary: ${job.salaryInfo} ${job.salary},
        Job Description: ${job.descriptionText},
        Seniority Level: ${job.seniorityLevel},
        Job Function: ${job.jobFunction},
        Apply URL: ${job.applyUrl},
        Posted by: ${job.jobPosterName}
    `;
    
    jobArr.push(jobString);
    console.log(jobString);
}
