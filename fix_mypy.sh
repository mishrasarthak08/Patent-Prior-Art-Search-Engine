#!/bin/bash
sed -i '' 's/API_KEYS = \[\]/API_KEYS: list\[str\] = \[\]/g' backend/app/utils/key_manager.py
sed -i '' 's/payload = hit.payload/payload = hit.payload or {}/g' backend/app/retrieval/bm25_retriever.py
sed -i '' 's/llm = ChatGoogleGenerativeAI(/llm = ChatGoogleGenerativeAI(  # type: ignore/g' backend/app/retrieval/query_understanding.py
sed -i '' 's/llm = ChatGoogleGenerativeAI(/llm = ChatGoogleGenerativeAI(  # type: ignore/g' backend/app/retrieval/explain.py
sed -i '' 's/self.embeddings = GoogleGenerativeAIEmbeddings(/self.embeddings = GoogleGenerativeAIEmbeddings(  # type: ignore/g' backend/app/retrieval/dense_retriever.py
sed -i '' 's/self.embeddings = GoogleGenerativeAIEmbeddings(/self.embeddings = GoogleGenerativeAIEmbeddings(  # type: ignore/g' backend/app/retrieval/dense_retriever.py
