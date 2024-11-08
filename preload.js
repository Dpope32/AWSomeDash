require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

window.getMetrics = async () => {
  const dynamodb = new AWS.DynamoDB();
  const s3 = new AWS.S3();

  const getMemeDynamoCount = async () => {
    const response = await dynamodb.describeTable({ TableName: 'Memes' }).promise();
    return response.Table.ItemCount;
  };

  getUserCount = async () => {
    const response = await dynamodb.describeTable({ TableName: 'Profiles' }).promise();
    return response.Table.ItemCount;
  };

  const getS3ObjectCount = async () => {
    const response = await s3.listObjectsV2({ Bucket: 'jestr-meme-uploads' }).promise();
    return response.KeyCount || 0;
  };

  return {
    userCount: await getUserCount(),
    memeDynamoCount: await getMemeDynamoCount(),
    totalMemes: await getS3ObjectCount(),
  };
};