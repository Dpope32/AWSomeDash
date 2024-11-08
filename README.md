##AWSomeDash

###AWSomeDash  is a dashboard application designed to provide real-time metrics and insights into AWS resources, including DynamoDB tables, S3 storage, user metrics, and more. This application uses AWS SDK and environment variables to securely manage access and metrics for your AWS resources.

##Features
Real-Time AWS Metrics: Track counts from DynamoDB tables, recent S3 objects, user interactions, and other AWS resources.
User-Friendly Interface: Clean and responsive design for easy visualization.
Environment-Based Configuration: Securely loads AWS credentials and configurations from environment variables.
Extensive AWS Resource Coverage: Access metrics from multiple AWS services, including DynamoDB, S3, and custom metrics.
Installation
Clone the repository:

git clone https://github.com/Dpope32/AWSomeDash.git
cd AWSomeDash

##Install dependencies:
npm install

##Environment Configuration:
###Create a .env file in the project root and add your AWS credentials:

AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
***Note: For security, do not commit your .env file to the repository.

##Adjust loadMetrics and others to your specific use case. 

##Run the application:
npm start

**After starting the application, you’ll be able to view metrics for various AWS resources directly on the dashboard. You can refresh metrics as needed using the provided refresh functionality.

##Project Structure
-renderer.jsx: Renders the dashboard UI with AWS metrics and charts.
  Components:
    -Metrics: Displays core metrics (e.g., user count, meme count).
    -MemeHistoryGraph: Graphical representation of meme history over time.
    -MemeGrid: Displays a grid view of memes stored in S3.
    
##Requirements
Node.js
AWS SDK (configured via environment variables)
Contributing
Feel free to fork the project and submit pull requests. Contributions for new features, bug fixes, or UI improvements are welcome.

License
This project is licensed under the MIT License.
