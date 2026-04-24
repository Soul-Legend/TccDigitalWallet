pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

// AgeRange: proves that a person's age >= threshold without revealing the birthdate.
//
// Public inputs:  currentYear, currentMonth, currentDay, threshold
// Private inputs: birthYear, birthMonth, birthDay
//
// The circuit computes the age (accounting for whether the birthday has
// occurred yet in the current year) and constrains age >= threshold.

template AgeRange() {
    signal input birthYear;     // private
    signal input birthMonth;    // private (1-indexed)
    signal input birthDay;      // private
    signal input currentYear;   // public
    signal input currentMonth;  // public  (1-indexed)
    signal input currentDay;    // public
    signal input threshold;     // public

    // Step 1: base age = currentYear - birthYear
    signal baseAge;
    baseAge <== currentYear - birthYear;

    // Step 2: determine if the birthday has NOT yet occurred this year.
    // Birthday has not occurred if:
    //   currentMonth < birthMonth, OR
    //   currentMonth == birthMonth AND currentDay < birthDay
    //
    // We use LessThan comparators (inputs assumed < 2^32).

    // monthLess = (currentMonth < birthMonth) ? 1 : 0
    component monthLT = LessThan(32);
    monthLT.in[0] <== currentMonth;
    monthLT.in[1] <== birthMonth;

    // monthEqual = (currentMonth == birthMonth) ? 1 : 0
    component monthEQ = IsEqual();
    monthEQ.in[0] <== currentMonth;
    monthEQ.in[1] <== birthMonth;

    // dayLess = (currentDay < birthDay) ? 1 : 0
    component dayLT = LessThan(32);
    dayLT.in[0] <== currentDay;
    dayLT.in[1] <== birthDay;

    // birthdayNotYet = monthLess OR (monthEqual AND dayLess)
    //               = monthLT.out + monthEQ.out * dayLT.out - monthLT.out * monthEQ.out * dayLT.out
    // Since monthLT.out and (monthEQ.out * dayLT.out) are mutually exclusive
    // (can't have month < birthMonth AND month == birthMonth simultaneously),
    // we can simplify:
    signal monthEqAndDayLt;
    monthEqAndDayLt <== monthEQ.out * dayLT.out;

    signal birthdayNotYet;
    birthdayNotYet <== monthLT.out + monthEqAndDayLt;
    // Note: monthLT.out + monthEqAndDayLt is always 0 or 1 because the two
    // terms are mutually exclusive. No overflow risk.

    // Step 3: actual age = baseAge - birthdayNotYet
    signal age;
    age <== baseAge - birthdayNotYet;

    // Step 4: constrain age >= threshold
    // i.e., age - threshold >= 0
    // Using GreaterEqThan(32): out = 1 if in[0] >= in[1]
    component geq = GreaterEqThan(32);
    geq.in[0] <== age;
    geq.in[1] <== threshold;

    // The proof is only valid if age >= threshold
    geq.out === 1;
}

component main {public [currentYear, currentMonth, currentDay, threshold]} = AgeRange();
