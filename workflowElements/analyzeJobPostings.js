import fs from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';

config();

// AI job analysis function - exported for use in other modules
export async function analyzeJob(job, resumeContent, openaiInstance) {
    try {
        const salaryInfo = job.salaryInfo || job.salary || 'Not specified';
        
        const response = await openaiInstance.chat.completions.create({
            model: "gpt-4o-mini",
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
                    - Strictly seeking a technical role that acts a bridge between technical and business functions. Solutioning, consulting, and client interaction are key aspects.
                    - Looking for a role in AI engineering that focuses on building and deploying AI-powered systems, candidate has no experience in machine learning model development.
                    - Prefers role to have a sales component to the job (with commission pay added to base salary), although not strictly required.
                    - Wants the highest salary possible, but is also open to roles that offer strong growth potential and learning opportunities.
                    - Prefers remote work but is open to hybrid or in-office roles if the listed salary is exceptional.
                    - Interested in roles that align with their skills in software development, project management, and team leadership.
                    
                    CANDIDATE STRENGTHS:
                    - Strong background in full stack software development, project management, and financial markets, python, javascript, data analytics
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
                    }`
                }
            ]
        });
        
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error(`   ❌ Error analyzing job: ${error.message}`);
        return {
            apply: false,
            reason: "Error occurred during analysis - unable to process job details",
            jobDescription: "Technical analysis failed due to processing error",
        };
    }
}

// Filter jobs to only include those with poster names
export function filterJobsWithPosterNames(jobData) {
    console.log(`📋 Filtering jobs for poster names...`);
    const validJobs = jobData.filter(job => job.jobPosterName && job.jobPosterName.trim() !== '');
    console.log(`   Found ${validJobs.length} valid jobs out of ${jobData.length} total jobs that have a job poster name`);
    return validJobs;
}

// Process and analyze multiple jobs
export async function DetermineIfApply(validJobs, resumeContent, openaiInstance) {
    console.log(`🚀 Processing ${validJobs.length} jobs...`);
    
    const results = [];
    
    for (let i = 10; i < validJobs.length; i++) {
        const job = validJobs[i];
        
        console.log(`\n${i + 1}. ${job.title} - ${job.companyName}`);
        console.log(`   Poster name: ${job.jobPosterName || 'Not specified'}`);
        
        const result = await analyzeJob(job, resumeContent, openaiInstance); ///////////////////////////////////////////////
        
        console.log(`   Apply: ${result.apply ? '✅ YES' : '❌ NO'}`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Summary: ${result.jobDescription}`);
        
        results.push({
            job,
            analysis: result,
            index: i + 1
        });
    }
    
    console.log(`\n📊 Processing complete. Found ${results.filter(r => r.analysis.apply).length} recommended jobs out of ${results.length} analyzed.`);
    
    return results;
}
