import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export async function customizeResume(jobDetails, originalResume, openaiInstance) {
    try {
        const response = await openaiInstance.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            max_tokens: 2000,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
                        You are an expert resume writer. You specialize in tailoring resumes to specific job postings while maintaining authenticity. 
                        Your goal is to optimize keyword matching, highlight relevant experiences, and present the candidate in the best possible light for the target role.

                        Always respond with valid JSON matching the specified schema.
                        `
                },
                {
                    role: "user",
                    content: `
                        CUSTOMIZATION INSTRUCTIONS:
                        - Maintain truthfulness - do not add fake experiences or skills that do no exist in the ORIGINAL RESUME, but you can enhance descriptions of existing experiences relevant to the job posting
                        - Optimize keywords to match the job description (ATS-friendly)
                        - Modify the SUMMARY section (if necessary) to better align with the job description - do not include experiences or skills not present in the original resume
                        - Modify the SKILLS section (if necessary) to better align with the job. Soft skills (ie. leadership, communication, etc.) can be adjusted an appropriate amount to match the job description while keeping technical skills truthful
                        - Format for professional presentation (and keep the resume 1 page)

                        JOB THE CANDIDATE IS APPLYING FOR:
                        Title: ${jobDetails.title}
                        Company: ${jobDetails.companyName}
                        Industry: ${jobDetails.industries || 'Not specified'}
                        Job Function: ${jobDetails.jobFunction || 'Not specified'}
                        Company Description: ${jobDetails.companyDescription || 'Not specified'}
                        Job Description: ${jobDetails.descriptionText}


                        ORIGINAL RESUME:
                        ${originalResume}

                        Provide the customized resume using this exact JSON schema:
                        {
                        "customizedResume": "Full customized resume content in markdown format",
                        "matchScore": 85,
                        "improvementSuggestions": ["List of 2-3 specific suggestions for further resume improvements"]
                        }
                        `
                }
            ]
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Save the customized resume to a file
        const filename = result.recommendedFilename || `resume_${jobDetails.companyName}_${jobDetails.title}`.replace(/[^a-zA-Z0-9]/g, '_');
        const resumePath = path.join(process.cwd(), 'customized_resumes', `${filename}.md`);
        
        // Ensure the directory exists
        const dir = path.dirname(resumePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write the customized resume to file
        fs.writeFileSync(resumePath, result.customizedResume);
        
        return {
            success: true,
            resumeContent: result.customizedResume,
            resumeFilePath: resumePath,
            matchScore: result.matchScore,
            improvementSuggestions: result.improvementSuggestions,
            savedToFile: resumePath,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`Error customizing resume: ${error.message}`);
        return {
            success: false,
            message: error.message,
            resumeContent: null,
            resumeFilePath: null,
            matchScore: 0
        };
    }
}
