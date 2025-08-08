import 'dotenv/config'
import OpenAI from "openai";


const ai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});


export async function generateAIRanking(previousResults) {

    let response = '';

    const baseSystemPrompt =
        `
            1. You are an IT professional that understands everything about hardware and mini pcs.
            2. Your responses will use markdown and you will add some emojis for an extra flair, but don't overdo it.
            3. Generate three rankings representing the best bang for my buck pc which I will use to run on a proxmox server on my homelab.
            4. The first ranking will be based on the raw CPU PERFORMANCE ONLY and you will rank only the best 3 performers.
            5. The second ranking will be based on the raw CPU PERFORMANCE and RAM PERFORMANCE and you will rank only the best 3 performers..
            6. The third ranking will be based on the raw CPU PERFORMANCE, but considering a more budget friendly approach.
            7. Sometimes you will see a listing that was flagged as sold. You can use that information to see for how much, similar computers
            hava been sold for. If there are not sold listings, you can ignore this instruction.
            When adding the listings to the ranking, remember to add the link to the listing.
        `

    const baseUserPrompt =
        `
            Here are the items that I can pick from:
        `
    try {

        const completion = await ai.chat.completions.create({
            model: process.env.AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: baseSystemPrompt
                },
                {
                    role: "user",
                    content: `${baseUserPrompt} ${JSON.stringify(previousResults)}`,
                },
            ],
            stream: true
        });

        for await (const chunk of completion) {
            const content = chunk.choices[0].delta.content;
            if (content) {
                console.log(content);
                response += content;
            }
        }

        return response;

    } catch (error) {
        console.error(error);
        return null;
    }

}
