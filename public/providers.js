// Name | domain (logo + dashboard) | default env var | secret prefix regex (optional)
// Order matters for detection: specific prefixes first, generic ones (OpenAI's sk-) last.
const PROVIDERS = String.raw`
Anthropic|anthropic.com|ANTHROPIC_API_KEY|^sk-ant-
OpenRouter|openrouter.ai|OPENROUTER_API_KEY|^sk-or-
Helicone|helicone.ai|HELICONE_API_KEY|^sk-helicone-
Langfuse|langfuse.com|LANGFUSE_SECRET_KEY|^sk-lf-
DeepSeek|deepseek.com|DEEPSEEK_API_KEY|^sk-[a-f0-9]{32}$
Cartesia|cartesia.ai|CARTESIA_API_KEY|^sk_car_
ElevenLabs|elevenlabs.io|ELEVENLABS_API_KEY|^sk_[a-f0-9]{48}$
Stripe|stripe.com|STRIPE_SECRET_KEY|^(sk|rk|pk)_(live|test)_
OpenAI|openai.com|OPENAI_API_KEY|^sk-(proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}
Google Gemini|gemini.google.com|GEMINI_API_KEY|^AIza[0-9A-Za-z_-]{30,}
Groq|groq.com|GROQ_API_KEY|^gsk_
xAI Grok|x.ai|XAI_API_KEY|^xai-
Perplexity|perplexity.ai|PERPLEXITY_API_KEY|^pplx-
Mistral AI|mistral.ai|MISTRAL_API_KEY|
Cohere|cohere.com|COHERE_API_KEY|
Together AI|together.ai|TOGETHER_API_KEY|^tgp_v1_
Fireworks AI|fireworks.ai|FIREWORKS_API_KEY|^fw_
Replicate|replicate.com|REPLICATE_API_TOKEN|^r8_
Hugging Face|huggingface.co|HF_TOKEN|^hf_
Cerebras|cerebras.ai|CEREBRAS_API_KEY|^csk-
Nvidia NIM|build.nvidia.com|NVIDIA_API_KEY|^nvapi-
Anyscale|anyscale.com|ANYSCALE_API_KEY|^esecret_
SambaNova|sambanova.ai|SAMBANOVA_API_KEY|
Hyperbolic|hyperbolic.xyz|HYPERBOLIC_API_KEY|
Novita AI|novita.ai|NOVITA_API_KEY|
DeepInfra|deepinfra.com|DEEPINFRA_API_KEY|
Lambda|lambda.ai|LAMBDA_API_KEY|
Moonshot Kimi|moonshot.ai|MOONSHOT_API_KEY|
Zhipu GLM|z.ai|ZAI_API_KEY|
Qwen DashScope|alibabacloud.com|DASHSCOPE_API_KEY|
MiniMax|minimax.io|MINIMAX_API_KEY|
AI21 Labs|ai21.com|AI21_API_KEY|
Reka|reka.ai|REKA_API_KEY|
Upstage|upstage.ai|UPSTAGE_API_KEY|
Sarvam AI|sarvam.ai|SARVAM_API_KEY|
Krutrim|olakrutrim.com|KRUTRIM_API_KEY|
Writer|writer.com|WRITER_API_KEY|
Azure OpenAI|azure.microsoft.com|AZURE_OPENAI_API_KEY|
Baseten|baseten.co|BASETEN_API_KEY|
RunPod|runpod.io|RUNPOD_API_KEY|^rpa_
Vast.ai|vast.ai|VAST_API_KEY|
Modal|modal.com|MODAL_TOKEN_ID|^ak-
Segmind|segmind.com|SEGMIND_API_KEY|
PiAPI|piapi.ai|PIAPI_API_KEY|
Kie.ai|kie.ai|KIE_API_KEY|
AIML API|aimlapi.com|AIML_API_KEY|
Eden AI|edenai.co|EDENAI_API_KEY|
Clarifai|clarifai.com|CLARIFAI_PAT|
Roboflow|roboflow.com|ROBOFLOW_API_KEY|
Voyage AI|voyageai.com|VOYAGE_API_KEY|^pa-
Jina AI|jina.ai|JINA_API_KEY|^jina_
Nomic|nomic.ai|NOMIC_API_KEY|^nk-
Mixedbread|mixedbread.com|MXBAI_API_KEY|
PlayHT|play.ht|PLAYHT_API_KEY|
Deepgram|deepgram.com|DEEPGRAM_API_KEY|
AssemblyAI|assemblyai.com|ASSEMBLYAI_API_KEY|
Speechmatics|speechmatics.com|SPEECHMATICS_API_KEY|
Gladia|gladia.io|GLADIA_API_KEY|
Rev.ai|rev.ai|REVAI_ACCESS_TOKEN|
LMNT|lmnt.com|LMNT_API_KEY|
Hume AI|hume.ai|HUME_API_KEY|
Resemble AI|resemble.ai|RESEMBLE_API_KEY|
Murf AI|murf.ai|MURF_API_KEY|
Fish Audio|fish.audio|FISH_AUDIO_API_KEY|
Rime|rime.ai|RIME_API_KEY|
Smallest.ai|smallest.ai|SMALLEST_API_KEY|
Speechify|speechify.com|SPEECHIFY_API_KEY|
WellSaid|wellsaidlabs.com|WELLSAID_API_KEY|
Inworld|inworld.ai|INWORLD_API_KEY|
Suno|suno.com|SUNO_API_KEY|
Udio|udio.com|UDIO_API_KEY|
Stability AI|stability.ai|STABILITY_API_KEY|
Midjourney|midjourney.com|MIDJOURNEY_API_KEY|
Leonardo AI|leonardo.ai|LEONARDO_API_KEY|
Ideogram|ideogram.ai|IDEOGRAM_API_KEY|
Recraft|recraft.ai|RECRAFT_API_KEY|
Black Forest Labs|bfl.ai|BFL_API_KEY|
fal.ai|fal.ai|FAL_KEY|^[0-9a-f]{8}-[0-9a-f-]{27}:[0-9a-f]{32}$
Runway|runwayml.com|RUNWAYML_API_SECRET|^key_
Luma AI|lumalabs.ai|LUMAAI_API_KEY|^luma-
Pika|pika.art|PIKA_API_KEY|
Kling AI|klingai.com|KLING_API_KEY|
HeyGen|heygen.com|HEYGEN_API_KEY|
Synthesia|synthesia.io|SYNTHESIA_API_KEY|
D-ID|d-id.com|DID_API_KEY|
Hedra|hedra.com|HEDRA_API_KEY|
Tavus|tavus.io|TAVUS_API_KEY|
Krea|krea.ai|KREA_API_KEY|
Freepik|freepik.com|FREEPIK_API_KEY|
Clipdrop|clipdrop.co|CLIPDROP_API_KEY|
remove.bg|remove.bg|REMOVEBG_API_KEY|
Photoroom|photoroom.com|PHOTOROOM_API_KEY|
DeepL|deepl.com|DEEPL_API_KEY|:fx$
Tavily|tavily.com|TAVILY_API_KEY|^tvly-
Firecrawl|firecrawl.dev|FIRECRAWL_API_KEY|^fc-
Exa|exa.ai|EXA_API_KEY|
Serper|serper.dev|SERPER_API_KEY|
SerpAPI|serpapi.com|SERPAPI_API_KEY|
Brave Search|brave.com|BRAVE_API_KEY|^BSA
Browserbase|browserbase.com|BROWSERBASE_API_KEY|^bb_(live|test)_
Browser Use|browser-use.com|BROWSER_USE_API_KEY|^bu_
Apify|apify.com|APIFY_TOKEN|^apify_api_
ScrapingBee|scrapingbee.com|SCRAPINGBEE_API_KEY|
Bright Data|brightdata.com|BRIGHTDATA_API_KEY|
E2B|e2b.dev|E2B_API_KEY|^e2b_
LangSmith|smith.langchain.com|LANGSMITH_API_KEY|^lsv2_
LlamaCloud|llamaindex.ai|LLAMA_CLOUD_API_KEY|^llx-
Weights & Biases|wandb.ai|WANDB_API_KEY|
Portkey|portkey.ai|PORTKEY_API_KEY|
Mem0|mem0.ai|MEM0_API_KEY|^m0-
Composio|composio.dev|COMPOSIO_API_KEY|
Zep|getzep.com|ZEP_API_KEY|
Pinecone|pinecone.io|PINECONE_API_KEY|^pcsk_
Weaviate|weaviate.io|WEAVIATE_API_KEY|
Qdrant|qdrant.tech|QDRANT_API_KEY|
Chroma|trychroma.com|CHROMA_API_KEY|^ck-
Unstructured|unstructured.io|UNSTRUCTURED_API_KEY|
Vapi|vapi.ai|VAPI_API_KEY|
Retell AI|retellai.com|RETELL_API_KEY|
Bland AI|bland.ai|BLAND_API_KEY|
LiveKit|livekit.io|LIVEKIT_API_KEY|
Daily|daily.co|DAILY_API_KEY|
Agora|agora.io|AGORA_APP_CERTIFICATE|
21st.dev|21st.dev|TWENTY_FIRST_API_KEY|
v0|v0.dev|V0_API_KEY|
Cursor|cursor.com|CURSOR_API_KEY|
Lovable|lovable.dev|LOVABLE_API_KEY|
Replit|replit.com|REPLIT_TOKEN|
GitHub|github.com|GITHUB_TOKEN|^(gh[pousr]_|github_pat_)
GitLab|gitlab.com|GITLAB_TOKEN|^glpat-
Bitbucket|bitbucket.org|BITBUCKET_TOKEN|^ATBB
Atlassian|atlassian.com|ATLASSIAN_API_TOKEN|^ATATT
AWS|aws.amazon.com|AWS_ACCESS_KEY_ID|^(AKIA|ASIA)[0-9A-Z]{16}$
Google OAuth|console.cloud.google.com|GOOGLE_CLIENT_SECRET|^GOCSPX-
Google Cloud|cloud.google.com|GOOGLE_APPLICATION_CREDENTIALS|
Firebase|firebase.google.com|FIREBASE_API_KEY|
Microsoft Azure|azure.microsoft.com|AZURE_API_KEY|
Cloudflare|cloudflare.com|CLOUDFLARE_API_TOKEN|
Vercel|vercel.com|VERCEL_TOKEN|
Netlify|netlify.com|NETLIFY_AUTH_TOKEN|^nfp_
Heroku|heroku.com|HEROKU_API_KEY|^HRKU-
Railway|railway.com|RAILWAY_TOKEN|
Render|render.com|RENDER_API_KEY|^rnd_
Fly.io|fly.io|FLY_API_TOKEN|^FlyV1
DigitalOcean|digitalocean.com|DIGITALOCEAN_TOKEN|^do[por]_v1_
Linode|linode.com|LINODE_TOKEN|
Hetzner|hetzner.com|HCLOUD_TOKEN|
Supabase|supabase.com|SUPABASE_KEY|^(sbp_|sb_secret_|sb_publishable_)
Neon|neon.tech|NEON_API_KEY|^napi_
PlanetScale|planetscale.com|PLANETSCALE_TOKEN|^pscale_(tkn|pw)_
MongoDB Atlas|mongodb.com|MONGODB_URI|^mongodb(\+srv)?://
Upstash|upstash.com|UPSTASH_REDIS_REST_TOKEN|
Redis|redis.io|REDIS_URL|^rediss?://
Turso|turso.tech|TURSO_AUTH_TOKEN|
Convex|convex.dev|CONVEX_DEPLOY_KEY|
Appwrite|appwrite.io|APPWRITE_API_KEY|
Clerk|clerk.com|CLERK_SECRET_KEY|
Auth0|auth0.com|AUTH0_CLIENT_SECRET|
Okta|okta.com|OKTA_API_TOKEN|
Docker Hub|docker.com|DOCKER_TOKEN|^dckr_pat_
npm|npmjs.com|NPM_TOKEN|^npm_
PyPI|pypi.org|PYPI_TOKEN|^pypi-
Expo|expo.dev|EXPO_TOKEN|
Sentry|sentry.io|SENTRY_AUTH_TOKEN|^sntr[ysu]s?_
Datadog|datadoghq.com|DD_API_KEY|
New Relic|newrelic.com|NEW_RELIC_API_KEY|^NRAK-
PostHog|posthog.com|POSTHOG_API_KEY|^ph[cx]_
Mixpanel|mixpanel.com|MIXPANEL_TOKEN|
Amplitude|amplitude.com|AMPLITUDE_API_KEY|
Segment|segment.com|SEGMENT_WRITE_KEY|
Doppler|doppler.com|DOPPLER_TOKEN|^dp\.
Postman|postman.com|POSTMAN_API_KEY|^PMAK-
Tailscale|tailscale.com|TAILSCALE_AUTHKEY|^tskey-
ngrok|ngrok.com|NGROK_AUTHTOKEN|
Terraform Cloud|hashicorp.com|TF_TOKEN|\.atlasv1\.
Figma|figma.com|FIGMA_TOKEN|^fig[dsu]_
Linear|linear.app|LINEAR_API_KEY|^lin_api_
Notion|notion.so|NOTION_API_KEY|^(secret_|ntn_)
Airtable|airtable.com|AIRTABLE_API_KEY|^pat[A-Za-z0-9]{14}\.
Asana|asana.com|ASANA_TOKEN|
Trello|trello.com|TRELLO_API_KEY|
ClickUp|clickup.com|CLICKUP_API_KEY|^pk_\d+_
Monday.com|monday.com|MONDAY_API_TOKEN|
HubSpot|hubspot.com|HUBSPOT_ACCESS_TOKEN|^pat-(na|eu)1-
Salesforce|salesforce.com|SALESFORCE_CLIENT_SECRET|
Intercom|intercom.com|INTERCOM_ACCESS_TOKEN|
Zendesk|zendesk.com|ZENDESK_API_TOKEN|
Slack|slack.com|SLACK_TOKEN|^xox[abeprs]-
Discord|discord.com|DISCORD_TOKEN|
Telegram|telegram.org|TELEGRAM_BOT_TOKEN|^\d{8,10}:[A-Za-z0-9_-]{35}$
Twilio|twilio.com|TWILIO_AUTH_TOKEN|^(SK|AC)[0-9a-f]{32}$
Vonage|vonage.com|VONAGE_API_SECRET|
SendGrid|sendgrid.com|SENDGRID_API_KEY|^SG\.
Resend|resend.com|RESEND_API_KEY|^re_
Mailgun|mailgun.com|MAILGUN_API_KEY|^key-
Postmark|postmarkapp.com|POSTMARK_SERVER_TOKEN|
Brevo|brevo.com|BREVO_API_KEY|^xkeysib-
Mailchimp|mailchimp.com|MAILCHIMP_API_KEY|-us\d{1,2}$
Loops|loops.so|LOOPS_API_KEY|
OneSignal|onesignal.com|ONESIGNAL_API_KEY|
Pusher|pusher.com|PUSHER_SECRET|
Ably|ably.com|ABLY_API_KEY|
PayPal|paypal.com|PAYPAL_CLIENT_SECRET|
Razorpay|razorpay.com|RAZORPAY_KEY_SECRET|^rzp_(live|test)_
Lemon Squeezy|lemonsqueezy.com|LEMONSQUEEZY_API_KEY|
Paddle|paddle.com|PADDLE_API_KEY|^pdl_
Polar|polar.sh|POLAR_ACCESS_TOKEN|^polar_
Plaid|plaid.com|PLAID_SECRET|
Coinbase|coinbase.com|COINBASE_API_KEY|
Shopify|shopify.com|SHOPIFY_ACCESS_TOKEN|^shp(at|ca|pa|ss)_
Mapbox|mapbox.com|MAPBOX_ACCESS_TOKEN|^[ps]k\.eyJ
Algolia|algolia.com|ALGOLIA_API_KEY|
Meilisearch|meilisearch.com|MEILI_MASTER_KEY|
Typesense|typesense.org|TYPESENSE_API_KEY|
Mux|mux.com|MUX_TOKEN_SECRET|
Cloudinary|cloudinary.com|CLOUDINARY_URL|^cloudinary://
UploadThing|uploadthing.com|UPLOADTHING_TOKEN|
Contentful|contentful.com|CONTENTFUL_ACCESS_TOKEN|
Sanity|sanity.io|SANITY_API_TOKEN|
Strapi|strapi.io|STRAPI_API_TOKEN|
Webflow|webflow.com|WEBFLOW_API_TOKEN|
Framer|framer.com|FRAMER_API_KEY|
Canva|canva.com|CANVA_CLIENT_SECRET|
Adobe|adobe.com|ADOBE_CLIENT_SECRET|
Dropbox|dropbox.com|DROPBOX_ACCESS_TOKEN|
Backblaze|backblaze.com|B2_APPLICATION_KEY|
Pinata|pinata.cloud|PINATA_JWT|
Spotify|spotify.com|SPOTIFY_CLIENT_SECRET|
YouTube|youtube.com|YOUTUBE_API_KEY|
X Twitter|x.com|X_BEARER_TOKEN|^AAAAAAAAAAAAAAAAAAAAA
Reddit|reddit.com|REDDIT_CLIENT_SECRET|
Meta|developers.facebook.com|META_ACCESS_TOKEN|^EAA
Instagram|instagram.com|INSTAGRAM_ACCESS_TOKEN|
LinkedIn|linkedin.com|LINKEDIN_CLIENT_SECRET|
TikTok|tiktok.com|TIKTOK_CLIENT_SECRET|
Twitch|twitch.tv|TWITCH_CLIENT_SECRET|
Steam|steampowered.com|STEAM_API_KEY|
Zapier|zapier.com|ZAPIER_API_KEY|
Make|make.com|MAKE_API_TOKEN|
n8n|n8n.io|N8N_API_KEY|
Pipedream|pipedream.com|PIPEDREAM_API_KEY|
Calendly|calendly.com|CALENDLY_TOKEN|
Cal.com|cal.com|CAL_API_KEY|^cal_
Typeform|typeform.com|TYPEFORM_TOKEN|
Tally|tally.so|TALLY_API_KEY|
DocuSign|docusign.com|DOCUSIGN_SECRET|
Dub|dub.co|DUB_API_KEY|^dub_
Bitly|bitly.com|BITLY_TOKEN|
Porkbun|porkbun.com|PORKBUN_API_KEY|^pk1_
Namecheap|namecheap.com|NAMECHEAP_API_KEY|
GoDaddy|godaddy.com|GODADDY_API_KEY|
OpenWeather|openweathermap.org|OPENWEATHER_API_KEY|
NewsAPI|newsapi.org|NEWS_API_KEY|
Alpha Vantage|alphavantage.co|ALPHAVANTAGE_API_KEY|
Polygon.io|polygon.io|POLYGON_API_KEY|
Finnhub|finnhub.io|FINNHUB_API_KEY|
CoinGecko|coingecko.com|COINGECKO_API_KEY|^CG-
Etherscan|etherscan.io|ETHERSCAN_API_KEY|
Alchemy|alchemy.com|ALCHEMY_API_KEY|
Infura|infura.io|INFURA_API_KEY|
Helius|helius.dev|HELIUS_API_KEY|
Moralis|moralis.io|MORALIS_API_KEY|
Unsplash|unsplash.com|UNSPLASH_ACCESS_KEY|
Pexels|pexels.com|PEXELS_API_KEY|
Giphy|giphy.com|GIPHY_API_KEY|
IPinfo|ipinfo.io|IPINFO_TOKEN|
Wolfram Alpha|wolframalpha.com|WOLFRAM_APP_ID|
`.trim().split('\n').map(l => {
  const [name, domain, env, ...re] = l.split('|'); // regexes may contain | themselves
  return { name, domain, env, re: re.join('|') ? new RegExp(re.join('|')) : null };
});

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function detectProvider(secret) {
  const s = (secret || '').trim();
  return s ? PROVIDERS.find(p => p.re && p.re.test(s)) || null : null;
}

// Match a typed name ("eleven labs", "ElevenLabs API") to a known provider.
function providerByName(name) {
  const n = norm(name);
  if (!n) return null;
  return PROVIDERS.find(p => norm(p.name) === n)
    || PROVIDERS.find(p => n.includes(norm(p.name)) && norm(p.name).length > 2)
    || PROVIDERS.find(p => norm(p.name).startsWith(n) && n.length > 2)
    || PROVIDERS.find(p => norm(p.domain.split('.')[0]) === n)
    || null;
}
