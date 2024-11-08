// renderer.jsx
const React = require('react');
const ReactDOM = require('react-dom');
const Recharts = require('recharts');
const { LineChart, Line, XAxis, YAxis, Tooltip } = Recharts;
require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Metrics Component
const Metrics = ({ refreshTrigger }) => {
  const [metrics, setMetrics] = React.useState({
    userCount: 0,
    memeCount: 0,
    memeDynamoCount: 0,
    recentCount: 0,
    storageCount: '0MB',
    interactionCount: 0,
    newUsersCount: 0,
    feedbackCount: 0,
    notificationCount: 0,
    likeCount: 0,
    commentCount: 0,
    conversationCount: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadMetrics = React.useCallback(async () => {
    try {
      // Fetch Total Users
      const totalUsersResponse = await dynamodb.scan({
        TableName: 'Profiles',
        Select: 'COUNT'
      }).promise();

      // Fetch Dynamo Memes Count
      const memeDynamoResponse = await dynamodb.scan({
        TableName: 'Memes',
        Select: 'COUNT'
      }).promise();

      // Fetch Open Feedback Count
      const feedbackResponse = await dynamodb.scan({
        TableName: 'UserFeedback',
        FilterExpression: '#st <> :closed',
        ExpressionAttributeNames: {
          '#st': 'status'
        },
        ExpressionAttributeValues: {
          ':closed': 'closed'
        },
        Select: 'COUNT'
      }).promise();

      // Fetch Total Interactions
      const interactionsResponse = await dynamodb.scan({
        TableName: 'UserInteractions',
        Select: 'COUNT'
      }).promise();

      // Calculate New Users Today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const newUsersResponse = await dynamodb.scan({
        TableName: 'Profiles',
        FilterExpression: 'created_at > :yesterday',
        ExpressionAttributeValues: {
          ':yesterday': yesterday.toISOString()
        },
        Select: 'COUNT'
      }).promise();

      const notificationResponse = await dynamodb.scan({
        TableName: 'UserNotifications',
        Select: 'COUNT'
      }).promise();

      const likeResponse = await dynamodb.scan({
        TableName: 'UserLikes',
        Select: 'COUNT'
      }).promise();

      const commentResponse = await dynamodb.scan({
        TableName: 'Comments',
        Select: 'COUNT'
      }).promise();

      const conversationResponse = await dynamodb.scan({
        TableName: 'UserConversations_v2',
        Select: 'COUNT'
      }).promise();

      // Fetch Total Memes from S3
      const s3Response = await s3.listObjectsV2({
        Bucket: 'jestr-meme-uploads',
        Prefix: 'Memes/'
      }).promise();

      // Calculate Storage Used
      const totalSize = s3Response.Contents.reduce((acc, file) => acc + file.Size, 0);
      const storageMB = Math.round(totalSize / 1024 / 1024);

      // Fetch Memes Posted Last 24h
      const last24h = new Date(Date.now() - 86400000);
      const recentFiles = s3Response.Contents.filter(f => new Date(f.LastModified) > last24h);


      setMetrics({
        userCount: totalUsersResponse.Count,
        memeCount: s3Response.KeyCount || 0,
        memeDynamoCount: memeDynamoResponse.Count,
        recentCount: recentFiles.length,
        storageCount: `${storageMB}MB`,
        interactionCount: interactionsResponse.Count,
        newUsersCount: newUsersResponse.Count,
        feedbackCount: feedbackResponse.Count,
        notificationCount: notificationResponse.Count,
        likeCount: likeResponse.Count,
        commentCount: commentResponse.Count,
        conversationCount: conversationResponse.Count,
      });
      setError(null);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      setLoading(true);
      loadMetrics();
    }
    return () => { isMounted = false; };
  }, [loadMetrics, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <p className="text-xl text-center text-gray-400">Loading Metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 rounded-lg p-4 shadow-lg">
        <p className="text-xl text-center text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-6">
      {/* Existing Metrics */}
      <MetricCard title="Total Users" value={metrics.userCount} color="blue" />
      <MetricCard title="Total Memes" value={metrics.memeCount} color="green" />
      <MetricCard title="Dynamo Memes" value={metrics.memeDynamoCount} color="violet" />
      <MetricCard title="Memes Posted Last 24h" value={metrics.recentCount} color="purple" />
      <MetricCard title="Storage Used" value={metrics.storageCount} color="yellow" />
      <MetricCard title="Total Interactions" value={metrics.interactionCount} color="red" />
      <MetricCard title="New Users Today" value={`+${metrics.newUsersCount}`} color="indigo" />
      <MetricCard title="Open Feedback" value={metrics.feedbackCount} color="orange" />
      
      {/* Additional Metrics */}
      <MetricCard title="Notifications" value={metrics.notificationCount} color="teal" />
      <MetricCard title="UserLikes" value={metrics.likeCount} color="cyan" />
      <MetricCard title="Comments" value={metrics.commentCount} color="emerald" />
      <MetricCard title="Conversations" value={metrics.conversationCount} color="pink" />
    </div>
  );
};

// MetricCard Component for Reusability
const MetricCard = ({ title, value, color }) => {
  const colorClass = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    violet: 'text-violet-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
    orange: 'text-orange-400',
    teal: 'text-teal-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    pink: 'text-pink-400',
  }[color] || 'text-white';

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-semibold mb-2 text-gray-400">{title}</h2>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
};

// MemeHistoryGraph Component
// Feel free to remove and replace with your own S3 Bucket / Dynamo MetaData table data
const MemeHistoryGraph = () => {
  const [historyData, setHistoryData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadTodaysCount = React.useCallback(async () => {
    try {
      const memeCount = await dynamodb.scan({
        TableName: 'Memes',
        Select: 'COUNT'
      }).promise();

      const today = new Date().toISOString().split('T')[0];
      
      let storedData = localStorage.getItem('memeHistory');
      let history = storedData ? JSON.parse(storedData) : [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      history = history.filter(item => new Date(item.date) > thirtyDaysAgo);
      
      const todayIndex = history.findIndex(item => item.date === today);
      if (todayIndex >= 0) {
        history[todayIndex].count = memeCount.Count;
      } else {
        history.push({ date: today, count: memeCount.Count });
      }
      
      history.sort((a, b) => new Date(a.date) - new Date(b.date));
      localStorage.setItem('memeHistory', JSON.stringify(history));
      setHistoryData(history);
      setError(null);
    } catch (err) {
      console.error('Error loading meme history:', err);
      setError('Failed to load meme history.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadTodaysCount();
    }
    return () => { isMounted = false; };
  }, [loadTodaysCount]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-6">
        <p className="text-xl text-center text-gray-400">Loading Meme History...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 rounded-lg p-6 mt-6">
        <p className="text-xl text-center text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-400">Meme Count History (30 Days)</h2>
      <div style={{ width: '100%', height: 300 }}>
        {historyData.length > 0 ? (
          <LineChart
            width={window.innerWidth - 100} // Adjust width as needed
            height={300}
            data={historyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tickFormatter={date => new Date(date).toLocaleDateString()}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                color: '#fff',
                borderRadius: '4px'
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ fill: '#60a5fa' }}
            />
          </LineChart>
        ) : (
          <p className="text-center text-gray-400">No data available.</p>
        )}
      </div>
    </div>
  );
};

// MemeGrid Component to render the images and videos
const MemeGrid = () => {
  const [images, setImages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchImages = React.useCallback(async () => {
    try {
      let allFiles = [];
      let continueToken = null;

      do {
        const params = {
          Bucket: 'jestr-meme-uploads',
          Prefix: 'Memes/',
          MaxKeys: 1000
        };

        if (continueToken) {
          params.ContinuationToken = continueToken;
        }

        const response = await s3.listObjectsV2(params).promise();
        allFiles = [...allFiles, ...response.Contents];
        continueToken = response.NextContinuationToken;
      } while (continueToken);

      const sortedFiles = allFiles
        .filter(item => !item.Key.endsWith('/'))
        .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
        .slice(0, 32);

      const imageUrls = await Promise.all(
        sortedFiles.map(async (object) => ({
          url: await s3.getSignedUrlPromise('getObject', {
            Bucket: 'jestr-meme-uploads',
            Key: object.Key,
            Expires: 3600
          }),
          key: object.Key,
          lastModified: object.LastModified,
          isVideo: object.Key.toLowerCase().endsWith('.mp4')
        }))
      );

      setImages(imageUrls);
      setError(null);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to fetch images.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchImages();
    }
    return () => { isMounted = false; };
  }, [fetchImages]);

  if (loading) {
    return (
      <div className="text-center mt-4">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 rounded-lg p-4 shadow-lg mt-6">
        <p className="text-xl text-center text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 mt-6">
      {images.map((image) => (
        <div key={image.key} className="relative">
          <div className="w-full pb-[100%] relative overflow-hidden bg-gray-800 rounded-lg">
            {image.isVideo ? (
              <video
                className="absolute inset-0 w-full h-full object-contain"
                controls
                preload="metadata"
              >
                <source src={image.url} type="video/mp4" />
              </video>
            ) : (
              <img
                src={image.url}
                alt={image.key}
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-xs">
            {new Date(image.lastModified).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

// App Component
const App = () => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 mb-4 p-6 rounded-lg shadow-lg">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 focus:outline-none"
          title="Refresh Metrics and Images"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
        <h1 className="text-4xl font-bold text-center">AWSomeDash</h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>
      
      {/* Metrics */}
      <Metrics refreshTrigger={refreshTrigger} />

      {/* Meme History Graph */}
      <MemeHistoryGraph />

      {/* Meme Grid */}
      <MemeGrid />
    </div>
  );
};

// Render the App
ReactDOM.render(<App />, document.getElementById('root'));
