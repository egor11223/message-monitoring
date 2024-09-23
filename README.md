# **Anomaly Detection Application Documentation**

## **Overview**
The Anomaly Detection Application is designed to monitor and identify unusual patterns in message data across various platforms e.g. Twitter, Facebook, Instagramm. The application groups messages into defined time intervals and detects anomalies based on statistical deviations.

## **Components**

1. **AnomalyDetectionService**
   - Core service responsible for executing the anomaly detection logic.
   - Use MongoDB aggregation pipelines to process and analyze message data.
   - Handles anomaly identification and triggers appropriate responses.
   - Detection happens asynchronous every minute before archiving

2. **Message Model/Scheme**
   - Defines the structure of the `messages` collection in MongoDB.
   - Includes indexes to optimize data sampling and additionaly fields to include some extra fields from different platforms e.v. hashtags

3. **Notification Service**
   - Handles the dispatch of alerts when anomalies are detected.
   - Can be integrated with email, Slack, Telegram, or other notification platforms.

4. **Archiving Service**
   - Archiving working by scheduler and trigger every minute to check necessity and archive old data in async mode. This solution does not guarantee a line limit of up to 100k lines at any time, but it does not slow down data insertion and under heavy load such a solution is advisable.
   - Archiving occurs without a transaction in order to reduce resource overhead. If the integrity of the archived data needs to be achieved, atomicity can be achieved.
5. **Faker stream service**
   - This is a service that simulates a stream from Twitter GET /2/tweets/search/stream
   - Rvery second it generates a chunk of data and transmits it via a stream to the handler, all data is mocked using faker.js
   - With the help of a faker, the intensity of the generated data is adjusted in order to simulate a jump in the trend. anomaly-detection.service.ts:41

## Anomaly detection logic

The Anomaly Detection System operates by aggregating data from the database and segmenting it into predefined time windows, such as every N minutes or hours. Within each window, the system calculates key statistical metrics, specifically the mean value and standard deviation of the data points.

For every time segment, the system assesses whether the data deviates significantly from the norm by applying the **Three Sigma Rule**. This rule identifies anomalies by flagging any data points that lie beyond three standard deviations from the mean, which is effective for detecting outliers in normally distributed datasets.

To optimize performance and ensure efficiency, the system caches the results of these calculations in **Redis**. This caching mechanism ensures that each segment is processed only once, eliminating the need for redundant computations in subsequent analyses.

When an anomaly is detected—i.e., when a data point violates the Three Sigma Rule—the system triggers the alerting mechanism. This results in an alert being sent through the **alerting system**, and a corresponding message is logged to the console for monitoring and debugging purposes.

**Key Workflow Steps:**

1. **Data Aggregation:**
   - Collect and aggregate data from the database.
   - Segment the data into time-based windows (e.g., every N minutes or hours).

2. **Statistical Calculation:**
   - Compute the mean and standard deviation for each time window.

3. **Anomaly Detection:**
   - Apply the Three Sigma Rule to identify data points that significantly deviate from the mean.
   
4. **Caching with Redis:**
   - Store the last checked interval of calculations in Redis to prevent redundant processing.

5. **Alerting:**
   - Log anomaly details to the console for further analysis.

**Benefits of Using the Three Sigma Rule:**

- **Effectiveness:** Efficiently identifies outliers in datasets that follow a normal distribution.
- **Simplicity:** Straightforward implementation with clear thresholds for anomaly detection.
- **Reliability:** Minimizes false positives by adhering to a statistically significant deviation criterion.

By following this streamlined process, the Anomaly Detection System ensures accurate and efficient identification of irregular patterns in data, facilitating timely interventions and maintaining data integrity.

## **Technologies Used**

- **NestJS**
  
- **Mongoose**
  
- **MongoDB**
  
- **TypeScript**

## **Installation and Setup**

### **Prerequisites**
- **Docker**

### **Steps to Run the Application**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/egor11223/message-monitoring.git
   cd message-monitoring
   ```

2. **Run the Application**
   ```bash
   docker compose --env-file .env up -d && docker compose logs app -f
   ```

3. **Trigger Anomaly Detection**
   - The anomaly detection process will be initiated automatically every 1 minute.

**Tips to reproduce alert:**
1. To check anomaly detection run service and wait several minutes to fill enough data to correct analization.
2. Change fake stream intensive up to 500-2k
3. Wait 2 minutes
4. Rollback intensive and observe alert (after 5 intervals).

In general, after five intervals (10 minutes by default) the anomaly detection will start to be displayed

## **Improvement Suggestions**

- **Performance**
  - Use K8s to scale system by several pods and assign "Master" which will be fetch data from the client (twitter API) and put by round-robbin into other pods. This will allow you to split the load and retrieve data in parallel without insertion and processing waiting.
  
- **Enhanced Notification Mechanisms**
  - Integrate multiple notification channels (e.g., SMS, push notifications) for more immediate alerts.
  
- **Optimization of calculations**
  - Save intermediate calculation data for each time interval in the database to avoid repeated calculations.
  - Distribute data from different platforms if they are excluded from general analytics to avoid DB overhead.
  
- **User Interface Dashboard**
  - Develop a frontend dashboard using frameworks like React or Angular to visualize anomalies and trends.
  
- **Machine Learning Integration**
  - Incorporate machine learning algorithms to improve anomaly detection accuracy and adaptability. (depends on business logic)
  
- **Configurable Thresholds**
  - Implement and allow users to customize thresholds through a configuration interface.