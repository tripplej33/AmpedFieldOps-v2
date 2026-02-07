# Phase 8 Deployment Options: DeepSeek-OCR-2

## Three Deployment Approaches

### Option A: Python Microservice (RECOMMENDED)
**Best For:** Production, team projects, separate scaling

#### Architecture
```
Frontend (React) → Express API → Python OCR Service (FastAPI)
                                      ↓
                              DeepSeek-OCR-2
                                      ↓
                                   GPU/CUDA
```

#### Pros
✅ Scales independently (can run OCR on separate machine)  
✅ Better error isolation (OCR crashes don't crash API)  
✅ Can use specialized GPU hardware  
✅ Team can develop in parallel (different languages)  
✅ Easy to monitor and restart  
✅ Production-ready (FastAPI is robust)  
✅ Supports batch processing efficiently  

#### Cons
❌ More complex setup (Docker, separate service)  
❌ Network latency (local socket is faster)  
❌ More infrastructure to manage  
❌ Learning curve for FastAPI  

#### Setup (2-3 hours)
```bash
# 1. Create Python microservice
ocr-service/
├── main.py                  # FastAPI app
├── ocr_processor.py         # DeepSeek-OCR-2 integration
├── field_extractor.py       # Extract structured data
├── requirements.txt         # Dependencies
├── Dockerfile              # Container image
└── config.py               # Settings

# 2. Python dependencies
torch==2.6.0
transformers>=4.40.0
vllm==0.8.5+cu118
pillow
fastapi
uvicorn
pydantic

# 3. Deploy
docker build -t deepseek-ocr:latest .
docker run --gpus all -p 8000:8000 deepseek-ocr:latest
```

#### Implementation (Node.js side)
```typescript
// backend/src/ocr/deepseek.ts
async function processDocument(filePath: string): Promise<string> {
  const response = await axios.post('http://ocr-service:8000/process', {
    image_path: filePath,
    prompt: "<image>\n<|grounding|>Convert the document to markdown."
  });
  return response.data.ocr_text;
}
```

#### docker-compose.yml
```yaml
services:
  ocr-service:
    build:
      context: .
      dockerfile: Dockerfile.ocr-service
    ports:
      - "8000:8000"
    environment:
      CUDA_VISIBLE_DEVICES: "0"
      HF_HOME: "/models"
    volumes:
      - ./models:/models
      - ./uploads:/uploads
    gpus:
      - all
    restart: unless-stopped

  backend:
    depends_on:
      - ocr-service
    environment:
      OCR_SERVICE_URL: "http://ocr-service:8000"
```

---

### Option B: Node.js Wrapper (SIMPLER)
**Best For:** Single machine, quick prototyping, smaller team

#### Architecture
```
Frontend (React)
    ↓
Express API (Node.js)
    ↓
Python Child Process (Node spawns Python)
    ↓
DeepSeek-OCR-2 + GPU
```

#### Pros
✅ Single language (JavaScript/TypeScript)  
✅ Simple setup (no separate service)  
✅ No network latency  
✅ Easy to debug  
✅ Lower memory overhead  
✅ Synchronous code flow  

#### Cons
❌ Can't scale independently  
❌ OCR failure crashes Express API  
❌ Limited to one machine  
❌ Harder to manage Python environment  
❌ Blocking operations possible  
❌ Less suitable for production  

#### Setup (1 hour)
```bash
# 1. Install Python alongside Node.js
conda create -n deepseek-ocr2 python=3.12.9
conda activate deepseek-ocr2
pip install torch transformers pillow

# 2. Create Python wrapper script
backend/src/ocr/deepseek-wrapper.py
```

#### Implementation (Node.js side)
```typescript
// backend/src/ocr/deepseek.ts
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

async function processDocument(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['src/ocr/deepseek-wrapper.py', filePath]);
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output).ocr_text);
      } else {
        reject(new Error('OCR processing failed'));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => python.kill(), 30000);
  });
}
```

#### Python Wrapper (Python)
```python
# backend/src/ocr/deepseek-wrapper.py
import sys
import json
from transformers import AutoModel, AutoTokenizer
import torch

def process_image(image_path: str) -> str:
    model_name = 'deepseek-ai/DeepSeek-OCR-2'
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModel.from_pretrained(
        model_name,
        _attn_implementation='flash_attention_2',
        trust_remote_code=True,
        use_safetensors=True
    ).eval().cuda().to(torch.bfloat16)
    
    prompt = "<image>\n<|grounding|>Convert the document to markdown."
    output = model.infer(tokenizer, prompt=prompt, image_file=image_path)
    return output['text']

if __name__ == '__main__':
    image_path = sys.argv[1]
    result = process_image(image_path)
    print(json.dumps({'ocr_text': result}))
```

---

### Option C: Hybrid / Cloud GPU (FLEXIBLE)
**Best For:** Distributed teams, cloud infrastructure, scalability

#### Architecture
```
Frontend (React)
    ↓
Express API (Main Server)
    ↓
GPU Server (Separate cloud instance)
    ↓
DeepSeek-OCR-2 + GPU/CUDA
```

#### Pros
✅ Scales independently  
✅ Can use managed GPU services (AWS, GCP, Azure)  
✅ Doesn't require local GPU  
✅ Easy to add more GPU servers  
✅ Can switch providers easily  
✅ Production-grade infrastructure  

#### Cons
❌ Network latency (slower than local)  
❌ Cloud costs (GPU rentals)  
❌ More complex setup  
❌ Requires DevOps knowledge  

#### Setup (4-6 hours)
```bash
# 1. Provision GPU instance (AWS g4dn, GCP L4, Azure NC)
# 2. Deploy Python OCR service on GPU instance
# 3. Expose via REST API (FastAPI)
# 4. Configure Express to call remote service

# Example: AWS SageMaker Endpoint
# Example: Replicate API
# Example: Custom GPU server on Digital Ocean
```

#### Implementation (Node.js side)
```typescript
// backend/src/ocr/deepseek.ts
async function processDocument(filePath: string): Promise<string> {
  const response = await axios.post(
    process.env.GPU_SERVICE_URL + '/process',
    { image_path: uploadToTempStorage(filePath) }
  );
  return response.data.ocr_text;
}

// Environment variable
// GPU_SERVICE_URL=https://gpu-server.example.com:8000
// or
// GPU_SERVICE_URL=https://api.replicate.com/v1/predictions
```

---

## Comparison Matrix

| Aspect | Option A (Microservice) | Option B (Node Wrapper) | Option C (Cloud GPU) |
|--------|-------------------------|------------------------|----------------------|
| **Setup Time** | 2-3 hours | 1 hour | 4-6 hours |
| **Complexity** | Medium | Low | High |
| **Scalability** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | $0 (self-hosted) | $0 (self-hosted) | $500+/month |
| **Dev Speed** | Medium | Fast | Slow |
| **Production Ready** | ✅ Yes | ⚠️ Maybe | ✅ Yes |
| **Error Isolation** | ✅ Good | ❌ Poor | ✅ Good |
| **Monitoring** | ✅ Easy | ❌ Hard | ✅ Easy |
| **Team Development** | ✅ Good | ❌ Tight Coupling | ✅ Great |
| **Single Machine** | ⚠️ Possible | ✅ Best | ❌ No |
| **Multi-GPU** | ✅ Easy | ❌ Hard | ✅ Easy |

---

## Recommended Path

### For Development (Now)
**→ Option B: Node.js Wrapper**
- Quickest to get working
- No Docker complexity
- Easy to debug
- Single developer can implement

### For Production (Later)
**→ Option A: Python Microservice**
- More robust
- Better isolation
- Can upgrade to Option C later
- Team development friendly

### Migration Path
```
Start with Option B
    ↓
Works? Add to Phase 8 mission
    ↓
Later: Containerize as Option A
    ↓
Scale to Option C if needed
```

---

## Hardware Requirements

### Minimum (Option B or C)
- CPU: 4 cores
- RAM: 16GB
- GPU: NVIDIA (CUDA 11.8+) with 8GB VRAM
- Example: RTX 3060 or RTX 4070

### Recommended (Option A)
- CPU: 8+ cores
- RAM: 32GB
- GPU: NVIDIA A100 or H100 (12GB+ VRAM)
- Example: AWS g4dn.2xlarge

### Budget Options
```
GPU Pricing (Approximate):
- RTX 3060: $300 (own hardware)
- RTX 4080: $1,200 (own hardware)
- AWS g4dn.xlarge: $0.52/hour ($372/month)
- AWS g4dn.2xlarge: $0.98/hour ($705/month)
- GCP L4: $0.35/hour ($252/month)
```

---

## Installation Quick Starts

### Option B: Local Python + Node.js (RECOMMENDED FOR DEV)
```bash
# 1. Set up Python environment
conda create -n deepseek-ocr2 python=3.12.9
conda activate deepseek-ocr2
cd /root/AmpedFieldOps-v2

# 2. Install PyTorch
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118

# 3. Install dependencies
pip install transformers>=4.40.0 pillow

# 4. Download model (2.6GB)
HF_TOKEN=your_token python -c "
from huggingface_hub import snapshot_download
snapshot_download('deepseek-ai/DeepSeek-OCR-2')
"

# 5. Verify installation
python -c "
from transformers import AutoModel, AutoTokenizer
model_name = 'deepseek-ai/DeepSeek-OCR-2'
tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
print('✅ DeepSeek-OCR-2 loaded successfully')
"

# 6. Start Express backend
npm run dev:backend
```

### Option A: Docker Microservice
```bash
# 1. Build image
docker build -f Dockerfile.ocr-service -t deepseek-ocr:latest .

# 2. Run with GPU support
docker run --gpus all \
  -p 8000:8000 \
  -v ./models:/models \
  -e CUDA_VISIBLE_DEVICES=0 \
  deepseek-ocr:latest

# 3. Test
curl -X POST http://localhost:8000/health
```

---

## Testing Each Option

### Option B: Local Test
```bash
# Run OCR on test image
python src/ocr/deepseek-wrapper.py test/receipt.jpg

# Expected output
# {"ocr_text": "OFFICE DEPOT\nDate: 01/28/2026\nTotal: $150.00\n..."}
```

### Option A: Docker Test
```bash
# Start service
docker-compose up ocr-service

# In another terminal
curl -X POST http://localhost:8000/process \
  -F "file=@test/receipt.jpg"

# Expected response
# {"ocr_text": "...", "processing_time_ms": 3200}
```

---

## Making the Choice

### Choose Option B if:
- 👤 Single developer (you)
- 💻 Testing locally first
- ⏱️ Need quick proof-of-concept
- 🎯 Not production yet
- 📍 Machine has GPU access

### Choose Option A if:
- 👥 Multiple developers
- 🏢 Production deployment
- 🚀 Scaling up later
- 📊 Need monitoring/logging
- 💪 High reliability needed

### Choose Option C if:
- 🌍 Distributed team
- ☁️ Cloud-native architecture
- 💰 Budget for cloud costs
- 📈 Expect high volume
- 🎯 Already using AWS/GCP

---

## Next: Implementation Decision

**Recommendation for Phase 8 Kickoff:**
1. Start with **Option B (Node.js Wrapper)** for development
2. Get OCR working end-to-end quickly
3. Demonstrate feature to user
4. Later migrate to **Option A** for production

This lets you:
- ✅ Build Phase 8 in parallel with Phase 7
- ✅ Validate approach without DevOps complexity
- ✅ Get feedback from user on OCR quality
- ✅ Upgrade to production-grade later

---

**Ready to proceed? Choose your deployment option and let's build Phase 8! 🚀**
