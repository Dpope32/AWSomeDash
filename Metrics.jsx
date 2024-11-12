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
        <MetricCard title="Total Users" value={metrics.userCount} color="blue" />
        <MetricCard title="Total Memes" value={metrics.memeCount} color="green" />
        <MetricCard title="Dynamo Memes" value={metrics.memeDynamoCount} color="violet" />
        <MetricCard title="Memes Posted Last 24h" value={metrics.recentCount} color="purple" />
        <MetricCard title="Storage Used" value={metrics.storageCount} color="yellow" />
        <MetricCard title="Total Interactions" value={metrics.interactionCount} color="red" />
        <MetricCard title="New Users Today" value={`+${metrics.newUsersCount}`} color="indigo" />
        <MetricCard title="Open Feedback" value={metrics.feedbackCount} color="orange" />
        <MetricCard title="Notifications" value={metrics.notificationCount} color="teal" />
        <MetricCard title="UserLikes" value={metrics.likeCount} color="cyan" />
        <MetricCard title="Comments" value={metrics.commentCount} color="emerald" />
        <MetricCard title="Conversations" value={metrics.conversationCount} color="pink" />
      </div>
    );
  };