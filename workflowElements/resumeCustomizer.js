import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export async function customizeResume(jobDetails, originalResume, openaiInstance) {
    try {
        const response = await openaiInstance.chat.completions.create({
            model: "gpt-4o",
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
                        You are an expert resume writer. You specialize in tailoring resumes to specific job postings while not adding any false information.
                        Your goal is to optimize keyword matching, highlight relevant experiences, and present the candidate in the best possible light for the target role.

                        Always respond with valid JSON matching the specified schema.
                        `
                },
                {
                    role: "user",
                    content: `
                        CUSTOMIZATION INSTRUCTIONS:
                        1: Modify the SUMMARY section by combining elements from the job description and the original resume to create a tailored human friendly summary that highlights relevant skills and experiences. DO NOT ADD FALSE EXPERIENCES OR SKILLS.
                        2: Modify the SKILLS "Client/Business Facing" and "Non-Technical" sections to better align with the soft skills from the job description

                        JOB THE CANDIDATE IS APPLYING FOR:
                        Title: ${jobDetails.title}
                        Company: ${jobDetails.companyName}
                        Industry: ${jobDetails.industries || 'Not specified'}
                        Job Function: ${jobDetails.jobFunction || 'Not specified'}
                        Company Description: ${jobDetails.companyDescription || 'Not specified'}
                        Job Description: ${jobDetails.descriptionText}


                        JOB CANDIDATE RESUME:
                        ${originalResume}

                        Provide the customized resume using this exact JSON schema:
                        {
                        "customizedResume": "Full customized resume content in markdown format",
                        }

                        The resume MUST BE in this markdown format:
                        # [Full Name]  
                        [email] | [phone number] | [LinkedIn URL]  

                        ## SUMMARY  
                        [3–5 sentence summary tailored to role, highlighting domain expertise, technical skills, and business value.]  

                        ## EDUCATION  
                        **[Degree, Major]** – [University]  
                        **[Certificates]** – [Institution]  

                        ## SKILLS  
                        **Technical:** [list technical skills separated by commas]  
                        **Non-Technical:** [list Non-Technical (soft) skills from job description]  
                        **Client/Business Facing:** [list business/soft skills]  

                        ## WORK EXPERIENCE  
                        ### [Job Title] -- [Company] ([Start Year] - [End Year or Present])  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  

                        ### [Job Title] -- [Company] ([Start Year] - [End Year])  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  

                        ### [Job Title] -- [Company] ([Start Year] - [End Year])  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  
                        - [Accomplishment/result statement with metrics]  

                        ## PROJECTS  
                        ### [Project Name] | [Link if applicable]  
                        - **Technologies:** [list]  
                        - **Functionality:** [1–2 sentence description of what the project does]  

                        ### [Project Name]  
                        - **Technologies:** [list]  
                        - **Functionality:** [1–2 sentence description of what the project does]  
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
