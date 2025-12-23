#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║     AURA - ML Pipeline End-to-End Test                        ║
# ╚═══════════════════════════════════════════════════════════════╝

PERCEPTION_URL="http://localhost:5001"
DECISION_URL="http://localhost:8000"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            AURA ML PIPELINE END-TO-END TEST                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check service health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Checking Service Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Checking Perception Layer ($PERCEPTION_URL)..."
PERCEPTION_HEALTH=$(curl -s $PERCEPTION_URL/health 2>/dev/null)
if [ -z "$PERCEPTION_HEALTH" ]; then
    echo "❌ Perception Layer NOT RUNNING!"
    echo "   Start it with: cd perception && source venv/bin/activate && python -m uvicorn app.main:app --port 5001"
    exit 1
else
    echo "✅ Perception Layer: $PERCEPTION_HEALTH"
fi

echo ""
echo "Checking Decision Layer ($DECISION_URL)..."
DECISION_HEALTH=$(curl -s $DECISION_URL/health 2>/dev/null)
if [ -z "$DECISION_HEALTH" ]; then
    echo "❌ Decision Layer NOT RUNNING!"
    echo "   Start it with: cd ml-service && source venv/bin/activate && python -m uvicorn app.main:app --port 8000"
    exit 1
else
    echo "✅ Decision Layer: $DECISION_HEALTH"
fi

# Step 2: Test Perception Layer with sample transcript
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Testing Perception Layer - Feature Extraction"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Sample interview transcript - LOW empathy scenario
LOW_EMPATHY_TRANSCRIPT='{
  "user_responses": [
    "I have 5 years of experience in software development. I know Java, Python, and JavaScript.",
    "I completed a project to migrate our monolithic application to microservices. It reduced deployment time by 40%.",
    "I prefer working independently. I get more done when I can focus without distractions.",
    "When there are conflicts, I usually just focus on my own work and let others sort it out."
  ],
  "interviewer_questions": [
    "Tell me about your background and experience.",
    "What is your most significant professional achievement?",
    "How do you prefer to work - in a team or independently?",
    "How do you handle conflicts in the workplace?"
  ],
  "response_durations": null
}'

# Sample interview transcript - HIGH empathy scenario
HIGH_EMPATHY_TRANSCRIPT='{
  "user_responses": [
    "I truly appreciate you taking the time to speak with me today. I have 5 years of experience and I understand how crucial it is to find the right fit for both parties.",
    "My proudest achievement was helping my team through a challenging migration project. I made sure everyone felt supported and we celebrated each small win together. The team morale stayed high throughout.",
    "I believe collaboration brings out the best in everyone. I love understanding different perspectives and finding ways to help my teammates succeed. When we work together, we achieve more than any individual could alone.",
    "When conflicts arise, I first try to understand where the other person is coming from. I listen actively and acknowledge their feelings before suggesting solutions. I find that showing empathy often helps resolve issues faster."
  ],
  "interviewer_questions": [
    "Tell me about your background and experience.",
    "What is your most significant professional achievement?",
    "How do you prefer to work - in a team or independently?",
    "How do you handle conflicts in the workplace?"
  ],
  "response_durations": null
}'

echo ""
echo "Testing with LOW EMPATHY transcript..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LOW_EMPATHY_FEATURES=$(curl -s -X POST "$PERCEPTION_URL/analyze/text" \
  -H "Content-Type: application/json" \
  -d "$LOW_EMPATHY_TRANSCRIPT")

if [ -z "$LOW_EMPATHY_FEATURES" ]; then
    echo "❌ Perception Layer failed to return features!"
    exit 1
fi

echo "✅ LOW EMPATHY Features extracted:"
echo "$LOW_EMPATHY_FEATURES" | python3 -m json.tool 2>/dev/null || echo "$LOW_EMPATHY_FEATURES"

echo ""
echo "Testing with HIGH EMPATHY transcript..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HIGH_EMPATHY_FEATURES=$(curl -s -X POST "$PERCEPTION_URL/analyze/text" \
  -H "Content-Type: application/json" \
  -d "$HIGH_EMPATHY_TRANSCRIPT")

echo "✅ HIGH EMPATHY Features extracted:"
echo "$HIGH_EMPATHY_FEATURES" | python3 -m json.tool 2>/dev/null || echo "$HIGH_EMPATHY_FEATURES"

# Step 3: Test Decision Layer with features
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Testing Decision Layer - ML Scoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract raw_metrics from perception response for LOW empathy (NOT text_metrics which are normalized)
LOW_TEXT_METRICS=$(echo "$LOW_EMPATHY_FEATURES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('raw_metrics', data.get('text_metrics', {}))))" 2>/dev/null)

echo ""
echo "Scoring LOW EMPATHY transcript..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOW_SCORES=$(curl -s -X POST "$DECISION_URL/score" \
  -H "Content-Type: application/json" \
  -d "{\"text_metrics\": $LOW_TEXT_METRICS, \"audio_metrics\": null, \"video_metrics\": null}")

echo ""
echo "✅ LOW EMPATHY Scores:"
echo "$LOW_SCORES" | python3 -m json.tool 2>/dev/null || echo "$LOW_SCORES"

# Extract raw_metrics from perception response for HIGH empathy (NOT text_metrics which are normalized)
HIGH_TEXT_METRICS=$(echo "$HIGH_EMPATHY_FEATURES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('raw_metrics', data.get('text_metrics', {}))))" 2>/dev/null)

echo ""
echo "Scoring HIGH EMPATHY transcript..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HIGH_SCORES=$(curl -s -X POST "$DECISION_URL/score" \
  -H "Content-Type: application/json" \
  -d "{\"text_metrics\": $HIGH_TEXT_METRICS, \"audio_metrics\": null, \"video_metrics\": null}")

echo ""
echo "✅ HIGH EMPATHY Scores:"
echo "$HIGH_SCORES" | python3 -m json.tool 2>/dev/null || echo "$HIGH_SCORES"

# Step 4: Compare scores
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Score Comparison"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOW_EMPATHY_SCORE=$(echo "$LOW_SCORES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('empathy', 'N/A'))" 2>/dev/null)
HIGH_EMPATHY_SCORE=$(echo "$HIGH_SCORES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('empathy', 'N/A'))" 2>/dev/null)

LOW_OVERALL=$(echo "$LOW_SCORES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('overall', 'N/A'))" 2>/dev/null)
HIGH_OVERALL=$(echo "$HIGH_SCORES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('overall', 'N/A'))" 2>/dev/null)

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    SCORE COMPARISON                           ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Metric          │  LOW Empathy   │  HIGH Empathy            ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Empathy Score   │     $LOW_EMPATHY_SCORE           │     $HIGH_EMPATHY_SCORE                     ║"
echo "║  Overall Score   │     $LOW_OVERALL           │     $HIGH_OVERALL                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$HIGH_EMPATHY_SCORE" != "N/A" ] && [ "$LOW_EMPATHY_SCORE" != "N/A" ]; then
    if [ "$HIGH_EMPATHY_SCORE" -gt "$LOW_EMPATHY_SCORE" ] 2>/dev/null; then
        echo "✅ ML MODEL IS WORKING CORRECTLY!"
        echo "   High empathy transcript scored higher on empathy ($HIGH_EMPATHY_SCORE > $LOW_EMPATHY_SCORE)"
    else
        echo "⚠️  Scores may need investigation"
        echo "   Expected HIGH empathy to score higher than LOW empathy"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
