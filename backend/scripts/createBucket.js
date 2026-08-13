const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'us-east-1', // Vultr uses us-east-1 generally for S3 compatibility 
  endpoint: 'https://del1.vultrobjects.com',
  credentials: {
    accessKeyId: 'QVN07YZVQ8686VAKDEZ2',
    secretAccessKey: 'eJJkPET86xzD0jQQ97GDfJBnUntKcS6R4JC0n84w',
  },
  forcePathStyle: true,
});

async function main() {
  try {
    const data = await client.send(new CreateBucketCommand({ Bucket: 'caderainfotech-tms' }));
    console.log('Bucket created successfully', data);
  } catch (err) {
    if (err.name === 'BucketAlreadyExists' || err.name === 'BucketAlreadyOwnedByYou') {
      console.log('Bucket already exists.');
    } else {
      console.error('Error creating bucket', err);
    }
  }
}

main();
