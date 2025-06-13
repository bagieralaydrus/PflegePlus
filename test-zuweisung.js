const AssignmentAlgorithm = require('./zuweisung-algorithm');

// Test-Funktion für den Patientenzuweisungsalgorithmus
async function testAlgorithm() {
    const algorithm = new AssignmentAlgorithm();

    try {
        console.log('=== Test des Patientenzuweisungsalgorithmus ===\n');

        // 1. Aktuelle Arbeitsbelastung anzeigen
        console.log('Aktuelle Arbeitsbelastung:');
        const workloads = await algorithm.getCurrentWorkloads();
        workloads.forEach(pf => {
            console.log(`${pf.benutzername}: ${pf.current_patients} Patienten`);
        });

        // 2. Erstmalige Zuweisung durchführen
        console.log('\n=== Durchführung der erstmaligen Zuweisung ===');
        const results = await algorithm.performInitialAssignment();
        console.log(`${results.filter(r => r.success).length} Patienten zugewiesen`);

        // 3. Endstatistiken anzeigen
        console.log('\n=== Endstatistiken ===');
        const stats = await algorithm.getStatistics();
        stats.forEach(stat => {
            console.log(`${stat.benutzername}: ${stat.assigned_patients}/24 Patienten`);
        });

    } catch (error) {
        console.error('Test fehlgeschlagen:', error);
    }
}

// Test ausführen
testAlgorithm();