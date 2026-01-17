/* calculations.js */

export const calculations = {
    // Mifflin-St Jeor Equation
    calculateBMR(weight, height, age, gender) {
        // weight in kg, height in cm, age in years
        let s = gender === 'female' ? -161 : 5;
        return (10 * weight) + (6.25 * height) - (5 * age) + s;
    },

    calculateTDEE(weight, height, age, gender = 'male') {
        const bmr = this.calculateBMR(weight, height, age, gender);
        // Sedentary Multiplier (1.2) - as per requirements "Sedentary TDEE... cannot be changed"
        return Math.round(bmr * 1.2);
    },

    calculateDailyDeficit(tdee, consumedCalories) {
        // Deficit = TDEE - In
        return tdee - consumedCalories;
    },

    // Project Future Weight
    // 3500 calories approx 1lb fat ?? Or use 7700 cal = 1kg
    // System uses KG. 7700 kcal deficit = 1kg weight loss.
    calculateProjectedWeight(currentWeight, dailyDeficit, days) {
        const totalDeficit = dailyDeficit * days;
        const weightLoss = totalDeficit / 7700;
        return currentWeight - weightLoss;
    },

    // Extrapolation of Goal Line
    // Returns weight for a specific date if traversing linearly from Start to Target
    getLinearGoalWeight(startDateStr, startWeight, targetDateStr, targetWeight, queryDateStr) {
        const start = new Date(startDateStr).getTime();
        const end = new Date(targetDateStr).getTime();
        const query = new Date(queryDateStr).getTime();

        if (query <= start) return startWeight;
        if (query >= end) return targetWeight;

        const totalDuration = end - start;
        const elapsed = query - start;
        const progress = elapsed / totalDuration; // 0 to 1

        const totalDrop = startWeight - targetWeight;
        return startWeight - (totalDrop * progress);
    }
};
