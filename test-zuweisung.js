const AssignmentAlgorithm = require('./zuweisung-algorithm');

async function testAlgorithm() {
    const algorithm = new AssignmentAlgorithm();

    try {
        console.log('=== Testing Patient Assignment Algorithm ===\n');

        // 1. Show current workloads
        console.log('Current workloads:');
        const workloads = await algorithm.getCurrentWorkloads();
        workloads.forEach(pf => {
            console.log(`${pf.benutzername}: ${pf.current_patients} patients`);
        });

        // 2. Perform initial assignment
        console.log('\n=== Performing Initial Assignment ===');
        const results = await algorithm.performInitialAssignment();
        console.log(`Assigned ${results.filter(r => r.success).length} patients`);

        // 3. Show statistics
        console.log('\n=== Final Statistics ===');
        const stats = await algorithm.getStatistics();
        stats.forEach(stat => {
            console.log(`${stat.benutzername}: ${stat.assigned_patients}/24 patients`);
        });

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAlgorithm();