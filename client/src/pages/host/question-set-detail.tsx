const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const csv = event.target?.result as string;
    const lines = csv.split("\n");
    const questions: QuestionInput[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      const firstCol = cols[0].toLowerCase();
      let qType: QuestionType = "multiple_choice";
      let text = "", optA = "", optB = "", optC = "", optD = "", correct = "", cat = "", diff: Difficulty = "medium", pts = "100", timeLimit = "30";

      if (["multiple_choice", "true_false", "open"].includes(firstCol)) {
        qType = firstCol as QuestionType;
        [, text, optA, optB, optC, optD, correct, cat, pts, timeLimit] = cols;
        const rawDiff = cols[8] as string;
        diff = (rawDiff === "easy" || rawDiff === "hard") ? rawDiff : "medium";
      } else {
        qType = "multiple_choice"; diff = "medium";
        [text, optA, optB, optC, optD, correct, cat, pts, timeLimit] = cols;
      }

      // Convert letter answer (A/B/C/D) to actual option text
      const optionMap: Record<string, string> = {
        A: optA, B: optB, C: optC, D: optD,
        a: optA, b: optB, c: optC, d: optD,
      };
      if (optionMap[correct]) correct = optionMap[correct];

      if (diff !== "easy" && diff !== "medium" && diff !== "hard") diff = "medium";

      if (qType === "true_false") {
        questions.push({ questionType: qType, text, options: ["True", "False"], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
      } else if (qType === "open") {
        questions.push({ questionType: qType, text, options: [], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
      } else if (text && optA && optB && optC && optD && correct) {
        questions.push({ questionType: "multiple_choice", text, options: [optA, optB, optC, optD], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
      }
    }
    if (questions.length > 0) setCsvPreview(questions);
    else toast.error("No valid questions found in CSV");
  };
  reader.readAsText(file);
};
