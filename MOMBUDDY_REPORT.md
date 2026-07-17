# Detailed Report on MomBuddy Chatbot

## 1. Introduction

MomBuddy is an AI-powered pregnancy and obstetrics chatbot designed to act as a compassionate digital assistant for expecting mothers and caregivers. The chatbot combines modern natural language processing, retrieval-augmented generation (RAG), speech recognition, and speech synthesis to provide helpful, empathetic, and medically informative responses.

Unlike a basic FAQ bot, MomBuddy is built to understand user questions in natural language and provide responses that resemble a supportive conversation with a knowledgeable health assistant. It was designed with pregnancy care in mind and can answer questions about common symptoms, antenatal care, high-risk pregnancy conditions, labor, postpartum care, and gynecological topics.

---

## 2. Purpose of MomBuddy

The main purpose of MomBuddy is to make pregnancy-related health information more accessible, supportive, and understandable.

Its key goals are:

- Provide instant answers to pregnancy-related questions
- Support users through text or voice interaction
- Offer a warm and empathetic conversational experience
- Use trusted medical textbook sources as grounding information
- Reduce the gap between a pregnant woman and reliable health guidance
- Serve as an educational assistant, not a replacement for a doctor

The chatbot was made to feel more human and reassuring, which is especially important in maternal health contexts where emotional support matters.

---

## 3. What MomBuddy Does

MomBuddy can:

- Accept questions typed by the user
- Accept spoken audio input and convert it into text
- Generate conversational responses using an LLM
- Read responses aloud using text-to-speech
- Retrieve relevant information from multiple medical books and knowledge sources
- Answer questions in a simple, friendly, and structured style

The chatbot is therefore not only a question-answering system, but also a voice-enabled support assistant.

---

## 4. Core Architecture of MomBuddy

MomBuddy follows a multi-layer architecture that combines retrieval and generation.

### 4.1 Input Layer
The input layer includes:

- Text-based questions entered by the user
- Voice input captured through microphone audio
- Audio files uploaded to the server for speech-to-text conversion

### 4.2 Retrieval Layer
The chatbot uses a retrieval-augmented approach. This means it does not rely only on the model’s memory. Instead, it first looks for the most relevant textbook passages before answering.

This retrieval layer uses:

- FAISS vector indexes built from PDF textbooks
- Sentence embeddings generated from user questions
- Similarity search to find the most relevant chunks of text
- A combination of textbook knowledge and preloaded structured knowledge

### 4.3 Language Model Layer
Once the relevant text chunks are retrieved, the system sends them to Gemini, which generates the final response.

This layer is responsible for:

- Producing natural and readable answers
- Interpreting medical context
- Explaining health topics clearly
- Writing in a supportive and empathetic tone

### 4.4 Output Layer
The output layer includes:

- Text responses shown in the browser or terminal
- Audio playback of the answer through text-to-speech
- A web interface that makes the assistant easy to use

---

## 5. Main Technologies Used

MomBuddy is built using a combination of modern AI and web technologies.

### Backend Technologies
- Python
- Flask
- FAISS
- SentenceTransformers
- Google Gemini API
- Whisper for speech-to-text
- gTTS for text-to-speech
- python-dotenv for environment configuration

### Frontend Technologies
- HTML
- CSS
- JavaScript
- A simple web interface rendered through Flask templates

### AI Components
- Embedding model: all-MiniLM-L6-v2
- LLM: Gemini 2.5 Flash
- Vector database: FAISS
- Speech recognition: Whisper
- Speech synthesis: gTTS

---

## 6. Knowledge Sources Used by MomBuddy

One of the most important parts of MomBuddy is its knowledge base. The chatbot is grounded in authoritative medical textbooks rather than just general internet knowledge.

### 6.1 Textbook Sources
The chatbot uses multiple medical books, including:

- DC Dutta’s Gynecology
- Oxford Handbook of Obstetrics & Gynaecology
- Williams Obstetrics

These textbooks provide strong medical context about pregnancy, obstetrics, and gynecology.

### 6.2 Structured Preloaded Knowledge
In addition to textbook PDFs, the project also includes a structured knowledge base file that contains curated pregnancy-related Q&A information. This helps the chatbot answer common issues more quickly and consistently.

### 6.3 Why These Sources Matter
Using textbook-based knowledge makes the chatbot more reliable than a generic chatbot. It provides a stronger foundation for evidence-based responses, especially in a medical domain.

---

## 7. Retrieval-Augmented Generation (RAG) Workflow

MomBuddy uses RAG, which is one of its most important technical features.

### 7.1 Step 1: PDF Ingestion
The system first processes PDF textbooks using the ingestion script. This step:

- Extracts text from each page
- Splits the content into smaller chunks
- Removes unnecessary whitespace and formatting noise
- Stores chunks with page metadata

### 7.2 Step 2: Embedding
Each text chunk is converted into a vector embedding. These embeddings capture the semantic meaning of the text.

This allows the system to search by meaning rather than only by keyword.

### 7.3 Step 3: Vector Search with FAISS
When a user asks a question, the system embeds the question and searches the FAISS index to find the most relevant chunks.

This is important because it allows the chatbot to retrieve the most relevant medical passages instead of relying on a large language model alone.

### 7.4 Step 4: Prompt Construction
The retrieved chunks are combined into a context prompt and sent to the language model together with the user’s question.

### 7.5 Step 5: Answer Generation
Gemini generates a final response based on the retrieved context and the model’s language abilities.

This makes the chatbot more grounded, more accurate, and less likely to hallucinate.

---

## 8. Voice and Speech Features

MomBuddy is not limited to text-only interaction. It includes voice-based capabilities.

### 8.1 Speech-to-Text
The chatbot supports speech input using Whisper. When a user uploads or speaks audio, the system converts the audio to text. This means users can ask questions verbally instead of typing them.

This is especially helpful for users who may find typing difficult or want a more natural experience.

### 8.2 Text-to-Speech
The chatbot can also read its answer aloud using gTTS.

This makes it more accessible and creates a more conversational interaction. In practical terms, the user can ask a question and hear the response spoken back to them.

### 8.3 Benefit of Voice Support
Voice features make the assistant more inclusive and practical for real-world use, especially in maternal healthcare situations where users may be multitasking or uncomfortable typing long questions.

---

## 9. User Experience Design

The user interface is kept simple and welcoming.

### 9.1 Web Interface
The chatbot has a clean web page with a pink and white themed design. This design choice makes the experience feel softer, calmer, and more approachable.

### 9.2 Interaction Style
The chatbot is designed to feel:

- Warm
- Empathetic
- Friendly
- Supportive
- Easy to understand

This matters because maternal health conversations can be emotionally sensitive. The chatbot avoids sounding cold or robotic.

### 9.3 Conversation Style
The system prompt instructs the chatbot to:

- Validate the user’s worries
- Speak gently
- Explain medical topics in simple language
- Ask follow-up questions
- End with a reminder to consult a qualified doctor or midwife

This gives the chatbot a more human and compassionate tone.

---

## 10. System Prompt and Behavior Design

A major part of MomBuddy’s behavior comes from its system prompt. This prompt defines how the assistant should speak and how it should respond.

The system prompt instructs the assistant to:

- Act like a caring and knowledgeable pregnancy companion
- Use textbook-based context as the main source of truth
- Use its own medical knowledge when the context is incomplete
- Avoid mentioning page numbers or citations
- Explain jargon in simpler language
- Provide long-form answers with bullet points or short paragraphs when needed
- End with a gentle question and a reminder to seek professional care

This is crucial because it shapes the assistant’s personality and response quality.

---

## 11. How the Chatbot Works in Practice

A typical conversation with MomBuddy follows this flow:

1. The user enters a question or speaks into the microphone.
2. The system converts the speech to text if necessary.
3. The question is embedded into a vector representation.
4. The system searches the FAISS indexes for relevant chunks.
5. Additional structured knowledge is also retrieved.
6. The question and retrieved context are merged into a prompt.
7. Gemini generates a response.
8. The response is displayed on the screen and optionally spoken aloud.

This process allows the chatbot to answer questions in a grounded and natural way.

---

## 12. Strengths of MomBuddy

MomBuddy has several important strengths:

### 12.1 Strong Medical Grounding
Because it uses textbook-based retrieval, the responses are more grounded than a general chatbot.

### 12.2 Multimodal Interaction
The chatbot supports both text and voice, which improves accessibility and ease of use.

### 12.3 Empathetic Tone
The assistant is designed to feel caring and supportive, which is valuable in maternal care.

### 12.4 Flexible Deployment
The chatbot can be run locally and can also be embedded into websites through an iframe.

### 12.5 Practical Use Case
It can be used for education, patient support, health awareness, and early guidance on common pregnancy concerns.

---

## 13. Limitations and Challenges

Although MomBuddy is a strong prototype, it also has limitations.

### 13.1 Not a Medical Diagnosis Tool
The chatbot should not be treated as a replacement for a doctor or midwife. It provides educational and supportive information, not diagnosis.

### 13.2 Dependence on Indexed Books
If the PDF indexes are missing, the chatbot cannot retrieve the intended textbook content.

### 13.3 LLM and API Dependency
The response generation depends on Gemini API access and internet connectivity.

### 13.4 Accuracy Depends on Retrieval Quality
If the retrieval step fails to find the right passages, the answer quality may drop.

### 13.5 Limited Clinical Validation
The system is useful as a prototype and assistant, but it would need clinical validation before being used in a high-stakes medical environment.

---

## 14. Practical Significance of MomBuddy

MomBuddy is significant because it brings AI into maternal healthcare in a user-friendly way. It helps users access pregnancy information more easily and supports them in a gentle, conversational manner.

The project shows how AI can be used not only for prediction or automation, but also for making health support more approachable, educational, and emotionally aware.

---

## 15. Conclusion

MomBuddy is a sophisticated chatbot system that combines retrieval-based medical knowledge, language generation, speech recognition, and a supportive conversational design. It was built to act as a digital pregnancy companion, offering trustworthy, empathetic, and accessible guidance for users asking pregnancy-related questions.

Its value lies in the combination of technology and care: it uses AI to retrieve relevant medical information, but it also presents that information in a warm and user-friendly way. This makes it more than a technical demo; it becomes a practical support tool for maternal health communication.
