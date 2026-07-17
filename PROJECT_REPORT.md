# Project Report: MatriCare / High-Risk Pregnancy Detection System

## 1. Project Overview

This project was built as a complete digital health solution for identifying high-risk pregnancies and assisting ASHA workers, doctors, and patients with early intervention. The system combines:

- A web application for patients and healthcare staff
- A backend API for authentication, profile management, prediction, and data handling
- An AI-based pregnancy risk prediction engine
- Explainable AI (XAI) features to show why a prediction was made
- A RAG-based report generation module using medical documents and an LLM
- A database layer for storing users, profiles, predictions, and pregnancy records

The overall goal was to create a practical solution that not only predicts risk, but also explains the reason behind the prediction and supports healthcare workflows.

---

## 2. What We Built

### 2.1 Frontend Application
We developed a user-facing web app using React and Vite with a modern UI. The frontend provides:

- Login and signup flows for patients, ASHA workers, and admins
- Patient profile setup and profile management
- Health tracking screens and guidance pages
- Dashboard views for ASHA workers and administrators
- A chatbot interface for user assistance
- Routing and access control for different roles

The frontend acts as the main interaction layer for patients and healthcare staff.

### 2.2 Backend API
We created a FastAPI-based backend that handles:

- User authentication and registration
- Profile management
- Prediction requests
- History storage
- Database and model integration
- Role-based logic for ASHA and admin users

The backend connects the web app with the AI pipeline and database.

### 2.3 AI Prediction Engine
We integrated a high-risk pregnancy prediction pipeline that uses a trained machine learning model. The system:

- Accepts patient clinical features
- Runs a prediction for high-risk or low-risk pregnancy
- Calculates confidence and probability values
- Generates explainability output using SHAP
- Maps important features to risk categories
- Produces structured medical reports

The AI pipeline is designed to function as a clinical decision support tool, not a replacement for medical judgment.

### 2.4 Explainable AI (XAI)
We added explainability so the prediction is not just a black-box result. The system explains which medical factors influenced the decision, such as:

- Blood pressure
- Hemoglobin
- Blood sugar
- Age
- Pregnancy history-related indicators

This makes the system more transparent and useful for healthcare professionals.

### 2.5 RAG-Based Medical Report Generation
We also implemented a report generation layer that uses:

- Medical documents stored in the project
- Vector search over relevant knowledge
- Prompt construction for an LLM
- Output in structured report format

This allows the system to create patient-friendly explanations and risk-based insights using medical knowledge.

---

## 3. Dataset Work

### 3.1 Datasets Used
The project uses several data files stored in the backend folder and related directories.

#### Main Dataset Files
- high_risk_pregnancy_realistic_2000.csv
  - Main dataset used for pregnancy-risk-related modeling and experimentation
  - Contains patient and clinical features relevant to pregnancy risk assessment

- mother_profile_dataset.csv
  - Contains maternal profile-related information such as pregnancy history and demographic details

- vitals_risk_assessment_dataset.csv
  - Contains vital sign and risk assessment-related values used for analysis and modeling support

- users_dataset.csv
  - Contains user-related data used for testing and seeding data workflows

#### Medical Knowledge Documents
The project also includes medical document folders for different pregnancy-related conditions such as:

- Fetal Growth Restriction (FGR)
- Gestational Diabetes Mellitus (GDM)
- Hypertensive Disorders of Pregnancy
- Maternal Anemia
- Maternal Infection
- Preterm Birth

These documents are used by the RAG system as knowledge sources for report generation.

### 3.2 How the Dataset Was Used
The dataset work included:

- Understanding and organizing clinical variables
- Identifying features necessary for prediction
- Preparing the dataset for training and validation workflows
- Cleaning data for consistency
- Handling missing or inconsistent values
- Converting raw values into structured records for use in the application

### 3.3 Data Cleaning and Preprocessing
We performed several preprocessing steps to improve data quality:

- Removed duplicate records where necessary
- Standardized text values such as village names and categories
- Filled missing numerical values using median-based imputation
- Normalized categorical values where needed
- Converted raw values into a consistent format for model use
- Created derived fields such as trimester and risk-related flags

These steps were important because clinical data can be noisy and inconsistent, and reliable preprocessing improves model quality.

### 3.4 Dataset Role in the System
The datasets support three major functions:

1. Model training and prediction support
2. Risk analysis and clinical feature understanding
3. Seed data and sample record generation for the app

In short, the dataset is the foundation of the AI prediction workflow and also supports the app’s demo and testing data.

---

## 4. Database Work

### 4.1 Database Purpose
The database layer stores all important application data, including:

- User accounts
- Patient profiles
- Prediction history
- Pregnancy records
- ASHA worker information
- Admin accounts
- Visit and referral logs

This was necessary so the system could function beyond a simple demo and support real application workflows.

### 4.2 Database Design
The system supports both MySQL and SQLite databases.

#### Main Tables
- user
  - Stores user login credentials and basic identity information
  - Includes role information such as patient, ASHA worker, or admin

- mother_profile
  - Stores maternal profile details such as age-related information, obstetric history, and gestational week data

- risk_assessment
  - Stores prediction history and prediction parameters for each user

- asha_worker
  - Stores ASHA worker details and assignment-related information

- pregnancy_record
  - Stores pregnancy records mapped from user predictions and profiles
  - Includes clinical fields such as BP, blood sugar, hemoglobin, risk class, visit status, referral, and due date

- visit_log
  - Stores visit history for patients

- referral_log
  - Stores referral-related actions and outcomes

- admin
  - Stores administrator-specific information

### 4.3 Database Initialization
The database is initialized automatically at startup. The backend creates tables if they do not yet exist and then seeds the system with initial records where appropriate.

This was implemented in the database setup logic so the application can run with minimal manual setup.

### 4.4 Seeding and Sample Data
We also created seed logic to populate example users and ASHA worker records. This helps the system work in development and demo environments.

The seeder logic includes:

- Dummy ASHA worker accounts
- Sample records for testing
- Deterministic generation of pregnancy-related sample data
- Assignment of ASHA workers to villages or regions

### 4.5 Sync Between App Data and Database
One important part of the project was making sure prediction, profile, and user data are synced into the database. For example:

- When a user signs up, their account data is stored
- When a profile is updated, profile information is saved in the database
- When a prediction is made, the result is written to history and pregnancy records
- When a pregnancy record is created or updated, it is linked to an ASHA worker and stored for follow-up

This creates a connected workflow between AI prediction and clinical record management.

### 4.6 Fallback Strategy
The project also supports a JSON-based fallback mechanism for user storage. This ensures the app remains functional even if the database layer is unavailable or not configured.

---

## 5. Machine Learning and AI Workflow

### 5.1 Prediction Pipeline
The prediction flow works like this:

1. Patient clinical values are collected from the frontend
2. The backend forwards them to the AI pipeline
3. A trained model predicts risk
4. The system calculates probabilities and confidence
5. SHAP values explain which features caused the prediction
6. Risk categories are mapped
7. Medical reports are generated using RAG + LLM

### 5.2 Why This Matters
This approach is more useful than a simple yes/no result because it adds:

- Transparency
- Clinical relevance
- Medical explanation
- Decision support for healthcare staff

---

## 6. Role-Based Functionalities

### Patient Side
Patients can:

- Register and log in
- Set up their profile
- Receive pregnancy risk prediction
- View health-related guidance
- Track pregnancy-related information

### ASHA Worker Side
ASHA workers can:

- Access a dashboard
- View assigned patient records
- Work with pregnancy cases and follow-up information
- Monitor status, referral flow, and visits

### Admin Side
Admins can:

- Manage system oversight
- Work with the healthcare workflow and associated records
- Monitor broad operations from a control perspective

---

## 7. Deployment and Project Structure

The project was structured to support deployment using both local development and production-style deployment flows. The repository includes:

- Backend configuration files
- Deployment guidance
- Frontend build settings
- Example service and Nginx configuration files

This makes it easier to move from development to deployment on a server or hosting platform.

---

## 8. Summary of Work Completed

In summary, we built a full pregnancy-risk support system that includes:

- A complete frontend interface
- A secure backend API
- AI-based risk prediction
- Explainable AI features
- Medical knowledge integration through RAG
- A structured database for storage and workflow management
- Dataset processing and preparation work
- Role-based health application workflows

The project is not just an ML demo; it is a practical health-tech application with data handling, database storage, user workflows, and AI-based decision support.

---

## 9. Final Conclusion

This project successfully combined machine learning, healthcare logic, web development, database management, and medical knowledge retrieval into one integrated system. The work covered both the technical implementation and the data domain understanding required for a meaningful maternal health application.
