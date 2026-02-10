import { AppState } from '../types';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1470578692844556488/1Op-TBxXHP4YZUyC9ro2QMA-UVx8kmxrAeZKCuYYYDYC-L60T7xZniQTnv1tBjziy4q9';

export const sendSaveToDiscord = async (state: AppState, reason: string) => {
    try {
        const timestamp = new Date().toISOString();
        const jsonString = JSON.stringify(state, null, 2);
        const fileName = `soullink_save_${timestamp.slice(0, 10)}.json`;
        
        // Create a blob for the file
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({
            content: `<@&1470579055727349926> **SoulLink Backup**\nReason: ${reason}\nTimestamp: ${timestamp}`,
            username: "SoulLink Bot",
        }));
        formData.append('file', blob, fileName);

        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });
        
        console.log('Successfully sent backup to Discord');
    } catch (error) {
        console.error('Failed to send backup to Discord:', error);
    }
};
