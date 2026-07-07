import dotenv from 'dotenv';
dotenv.config();

async function registerWebhook() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;
  
  // Replace this with your active ngrok public URL (must end with /api/sync)
  const notificationUrl = 'https://steering-lapdog-giveaway.ngrok-free.dev/api/sync';

  if (!baseId || !pat) {
    console.error("Missing AIRTABLE_BASE_ID or AIRTABLE_PAT in .env");
    return;
  }

  console.log(`🌐 Registering webhook for base ${baseId} pointing to ${notificationUrl}...`);

  const response = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notificationUrl,
      specification: {
        options: {
          filters: {
            dataTypes: ['tableData'],
          },
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Failed to register webhook:', data);
  } else {
    console.log('✅ Webhook registered successfully!');
    console.log('Webhook Details:', JSON.stringify(data, null, 2));
    console.log('\n⚠️  Note: Airtable webhooks expire every 7 days. You can renew them or run this script to re-register.');
  }
}

registerWebhook();
