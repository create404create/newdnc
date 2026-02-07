// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing script...');
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const startProcessBtn = document.getElementById('startProcess');
    const pauseProcessBtn = document.getElementById('pauseProcess');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const processedCount = document.getElementById('processedCount');
    const currentNumber = document.getElementById('currentNumber');
    const latestResult = document.getElementById('latestResult');
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const downloadCSVBtn = document.getElementById('downloadCSV');
    const downloadJSONBtn = document.getElementById('downloadJSON');
    const clearResultsBtn = document.getElementById('clearResults');
    const totalNumbers = document.getElementById('totalNumbers');
    const completedNumbers = document.getElementById('completedNumbers');
    const dncCount = document.getElementById('dncCount');
    const detailsCount = document.getElementById('detailsCount');
    const apiStatusElement = document.querySelector('.status-indicator');
    
    // Global variables
    let phoneNumbers = [];
    let results = [];
    let currentIndex = 0;
    let isProcessing = false;
    let isPaused = false;
    let totalProcessed = 0;
    let totalDNC = 0;
    let totalWithDetails = 0;
    
    console.log('Elements loaded:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        startProcessBtn: !!startProcessBtn
    });
    
    // Check API status on page load
    checkAPIStatus();
    
    // Fix for file upload click issue
    if (uploadArea && fileInput) {
        console.log('Setting up file upload listeners...');
        
        // File upload handling
        uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked');
            e.stopPropagation();
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
            console.log('Drag over upload area');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            console.log('Drag left upload area');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            console.log('File dropped on upload area');
            
            if (e.dataTransfer.files.length) {
                console.log('Files dropped:', e.dataTransfer.files[0].name);
                fileInput.files = e.dataTransfer.files;
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed');
            if (e.target.files.length) {
                console.log('File selected:', e.target.files[0].name);
                handleFileUpload(e.target.files[0]);
            }
        });
        
        // Add visual feedback for click
        uploadArea.style.cursor = 'pointer';
        
        // Test click handler
        uploadArea.addEventListener('mousedown', () => {
            uploadArea.style.transform = 'scale(0.98)';
        });
        
        uploadArea.addEventListener('mouseup', () => {
            uploadArea.style.transform = 'scale(1)';
        });
        
        uploadArea.addEventListener('mouseleave', () => {
            uploadArea.style.transform = 'scale(1)';
        });
    } else {
        console.error('Upload area or file input not found!');
    }
    
    // Process control buttons
    if (startProcessBtn) {
        startProcessBtn.addEventListener('click', startProcessing);
    }
    
    if (pauseProcessBtn) {
        pauseProcessBtn.addEventListener('click', togglePause);
    }
    
    if (downloadCSVBtn) {
        downloadCSVBtn.addEventListener('click', downloadCSV);
    }
    
    if (downloadJSONBtn) {
        downloadJSONBtn.addEventListener('click', downloadJSON);
    }
    
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', clearResults);
    }
    
    // Handle file upload
    function handleFileUpload(file) {
        console.log('Handling file upload:', file.name);
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        if (!['txt', 'csv'].includes(fileExtension)) {
            alert('Please upload a .txt or .csv file');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            console.log('File read successfully');
            const content = e.target.result;
            parsePhoneNumbers(content);
        };
        
        reader.onerror = function(e) {
            console.error('Error reading file:', e);
            alert('Error reading file. Please try again.');
        };
        
        reader.readAsText(file);
    }
    
    // Parse phone numbers from file content
    function parsePhoneNumbers(content) {
        console.log('Parsing phone numbers from content...');
        // Remove any non-digit characters and split by new lines
        const lines = content.split('\n');
        phoneNumbers = [];
        
        lines.forEach((line, index) => {
            // Clean the line and extract 10-digit numbers
            const cleanLine = line.trim().replace(/\D/g, '');
            if (cleanLine.length === 10) {
                phoneNumbers.push(cleanLine);
            } else {
                // Try to find 10-digit numbers in longer strings
                const numbers = line.match(/\d{10}/g);
                if (numbers) {
                    phoneNumbers.push(...numbers);
                }
            }
        });
        
        // Remove duplicates
        phoneNumbers = [...new Set(phoneNumbers)];
        
        console.log('Found phone numbers:', phoneNumbers.length);
        
        if (phoneNumbers.length === 0) {
            alert('No valid 10-digit phone numbers found in the file.');
            return;
        }
        
        // Update UI
        uploadArea.innerHTML = `
            <i class="fas fa-file-check" style="color: var(--success-color)"></i>
            <h3>File Uploaded Successfully!</h3>
            <p>Found ${phoneNumbers.length} unique phone numbers</p>
            <div class="file-format">
                <p><strong>Sample numbers:</strong> ${phoneNumbers.slice(0, 3).map(p => formatPhoneNumber(p)).join(', ')}${phoneNumbers.length > 3 ? '...' : ''}</p>
                <p><strong>File ready for processing.</strong> Click "Start Processing" to begin.</p>
            </div>
        `;
        
        // Re-add click handler to the new content
        const newUploadArea = document.getElementById('uploadArea');
        if (newUploadArea) {
            newUploadArea.addEventListener('click', () => fileInput.click());
            newUploadArea.style.cursor = 'pointer';
        }
        
        startProcessBtn.disabled = false;
        totalNumbers.textContent = phoneNumbers.length;
        
        // Show results section
        resultsSection.style.display = 'block';
    }
    
    // Start processing phone numbers
    function startProcessing() {
        console.log('Starting processing...');
        if (phoneNumbers.length === 0) {
            alert('Please upload a file with phone numbers first.');
            return;
        }
        
        isProcessing = true;
        isPaused = false;
        startProcessBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsSection.style.display = 'block';
        
        // Reset counters
        currentIndex = 0;
        totalProcessed = 0;
        totalDNC = 0;
        totalWithDetails = 0;
        results = [];
        resultsBody.innerHTML = '';
        
        updateProgress();
        processNextNumber();
    }
    
    // Toggle pause/resume
    function togglePause() {
        console.log('Toggle pause, currently paused:', isPaused);
        if (!isProcessing) return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            pauseProcessBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            pauseProcessBtn.classList.remove('btn-secondary');
            pauseProcessBtn.classList.add('btn-success');
            console.log('Processing paused');
        } else {
            pauseProcessBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            pauseProcessBtn.classList.remove('btn-success');
            pauseProcessBtn.classList.add('btn-secondary');
            console.log('Processing resumed');
            processNextNumber();
        }
    }
    
    // Process next phone number
    function processNextNumber() {
        console.log('Processing next number, index:', currentIndex, 'total:', phoneNumbers.length);
        
        if (!isProcessing || isPaused || currentIndex >= phoneNumbers.length) {
            if (currentIndex >= phoneNumbers.length) {
                console.log('All numbers processed, finishing...');
                finishProcessing();
            }
            return;
        }
        
        const phoneNumber = phoneNumbers[currentIndex];
        currentNumber.textContent = formatPhoneNumber(phoneNumber);
        
        // Update progress
        updateProgress();
        
        // Process the number (simulate API call with delay)
        console.log(`Processing number ${currentIndex + 1}/${phoneNumbers.length}: ${phoneNumber}`);
        checkPhoneNumber(phoneNumber).then(result => {
            console.log('Result received:', result);
            // Add to results
            results.push(result);
            addResultToTable(result);
            
            // Update counters
            totalProcessed++;
            
            if (result.dncStatus === 'Yes') {
                totalDNC++;
            }
            
            if (result.name && result.name !== 'Not Found') {
                totalWithDetails++;
            }
            
            // Update summary
            completedNumbers.textContent = totalProcessed;
            dncCount.textContent = totalDNC;
            detailsCount.textContent = totalWithDetails;
            
            // Show latest result
            latestResult.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
            
            // Move to next number
            currentIndex++;
            
            // Add delay to ensure proper checking (simulate slower processing)
            console.log(`Waiting 1 second before next number...`);
            setTimeout(() => {
                processNextNumber();
            }, 1000); // 1 second delay between requests
        }).catch(error => {
            console.error('Error checking number:', error);
            
            // Add error result
            const errorResult = {
                phone: phoneNumber,
                error: true,
                message: 'Failed to retrieve data',
                dncStatus: 'Error',
                ndnc: 'Error',
                sdnc: 'Error',
                state: 'Error',
                name: 'Error',
                address: 'Error',
                status: 'Error'
            };
            
            results.push(errorResult);
            addResultToTable(errorResult);
            
            // Update counters
            totalProcessed++;
            completedNumbers.textContent = totalProcessed;
            
            // Move to next number
            currentIndex++;
            
            // Continue with next number after delay
            setTimeout(() => {
                processNextNumber();
            }, 1000);
        });
    }
    
    // Check phone number using the API (via proxy)
    async function checkPhoneNumber(phoneNumber) {
        console.log('Checking phone number via API:', phoneNumber);
        const checkDNC = document.getElementById('checkDNC').checked;
        const checkDetails = document.getElementById('checkDetails').checked;
        
        let result = {
            phone: phoneNumber,
            dncStatus: 'Unknown',
            ndnc: 'Unknown',
            sdnc: 'Unknown',
            state: 'Unknown',
            name: 'Not Found',
            address: 'Not Found',
            status: 'Unknown',
            error: false
        };
        
        try {
            // Check DNC status (first API)
            if (checkDNC) {
                console.log('Checking DNC status...');
                const dncResponse = await fetch(`proxy.php?endpoint=tcpa&phone=${phoneNumber}`);
                console.log('DNC response status:', dncResponse.status);
                if (dncResponse.ok) {
                    const dncData = await dncResponse.json();
                    console.log('DNC data:', dncData);
                    
                    if (dncData.status === 'ok') {
                        result.dncStatus = dncData.listed === 'No' ? 'No' : 'Yes';
                        result.ndnc = dncData.ndnc || 'Unknown';
                        result.sdnc = dncData.sdnc || 'Unknown';
                        result.state = dncData.state || 'Unknown';
                    }
                }
            }
            
            // Check details (second API)
            if (checkDetails) {
                console.log('Checking details...');
                const detailsResponse = await fetch(`proxy.php?endpoint=details&phone=${phoneNumber}`);
                console.log('Details response status:', detailsResponse.status);
                if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    console.log('Details data:', detailsData);
                    
                    if (detailsData.status === 'ok') {
                        if (detailsData.person && detailsData.person.length > 0) {
                            const person = detailsData.person[0];
                            result.name = person.name || 'Not Found';
                            result.status = person.status || 'Unknown';
                            
                            if (person.addresses && person.addresses.length > 0) {
                                const address = person.addresses[0];
                                result.address = `${address.home || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim();
                                if (result.address === ',  ') result.address = 'Not Found';
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('API error:', error);
            result.error = true;
            result.message = 'API request failed';
        }
        
        console.log('Final result:', result);
        return result;
    }
    
    // Update progress bar and text
    function updateProgress() {
        const progress = ((currentIndex + 1) / phoneNumbers.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        processedCount.textContent = `${currentIndex + 1} of ${phoneNumbers.length} numbers processed`;
    }
    
    // Finish processing
    function finishProcessing() {
        console.log('Finishing processing');
        isProcessing = false;
        pauseProcessBtn.style.display = 'none';
        
        // Show completion message
        latestResult.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 10px;"></i>
                <h3>Processing Complete!</h3>
                <p>All ${phoneNumbers.length} phone numbers have been checked.</p>
                <p>You can now download the results.</p>
            </div>
        `;
        
        // Enable download buttons
        downloadCSVBtn.disabled = false;
        downloadJSONBtn.disabled = false;
        
        console.log('Processing complete');
    }
    
    // Add result to table
    function addResultToTable(result) {
        const row = document.createElement('tr');
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(result.phone);
        
        // Determine DNC status color
        const dncClass = result.dncStatus === 'Yes' ? 'dnc-yes' : 
                        result.dncStatus === 'No' ? 'dnc-no' : '';
        
        row.innerHTML = `
            <td>${formattedPhone}</td>
            <td class="${dncClass}">${result.dncStatus}</td>
            <td>${result.ndnc}</td>
            <td>${result.sdnc}</td>
            <td>${result.state}</td>
            <td>${result.name}</td>
            <td>${result.address}</td>
            <td>${result.status}</td>
        `;
        
        resultsBody.appendChild(row);
    }
    
    // Download CSV
    function downloadCSV() {
        console.log('Downloading CSV...');
        if (results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const headers = ['Phone Number', 'DNC Status', 'NDNC', 'SDNC', 'State', 'Name', 'Address', 'Status'];
        const csvRows = [headers.join(',')];
        
        results.forEach(result => {
            const row = [
                formatPhoneNumber(result.phone),
                result.dncStatus,
                result.ndnc,
                result.sdnc,
                result.state,
                `"${result.name.replace(/"/g, '""')}"`,
                `"${result.address.replace(/"/g, '""')}"`,
                result.status
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-check-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('CSV downloaded');
    }
    
    // Download JSON
    function downloadJSON() {
        console.log('Downloading JSON...');
        if (results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const jsonContent = JSON.stringify(results, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-check-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('JSON downloaded');
    }
    
    // Clear results
    function clearResults() {
        console.log('Clearing results...');
        if (isProcessing) {
            alert('Cannot clear results while processing is in progress.');
            return;
        }
        
        if (confirm('Are you sure you want to clear all results?')) {
            results = [];
            phoneNumbers = [];
            resultsBody.innerHTML = '';
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload Phone Numbers File</h3>
                <p>Drag & drop a .txt or .csv file with phone numbers (one per line) or click to browse</p>
                <input type="file" id="fileInput" accept=".txt,.csv">
                <div class="file-format">
                    <p><strong>File format:</strong> One phone number per line (10 digits, no formatting)</p>
                    <p>Example: 4045093823, 4045094083, 1234567890</p>
                </div>
            `;
            progressSection.style.display = 'none';
            resultsSection.style.display = 'none';
            startProcessBtn.disabled = true;
            
            // Reset counters
            totalNumbers.textContent = '0';
            completedNumbers.textContent = '0';
            dncCount.textContent = '0';
            detailsCount.textContent = '0';
            
            // Re-add click handler
            const newUploadArea = document.getElementById('uploadArea');
            if (newUploadArea) {
                newUploadArea.addEventListener('click', () => fileInput.click());
                newUploadArea.style.cursor = 'pointer';
            }
            
            console.log('Results cleared');
        }
    }
    
    // Format phone number as (XXX) XXX-XXXX
    function formatPhoneNumber(phone) {
        if (!phone) return 'Invalid';
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }
        return phone;
    }
    
    // Check API status
    async function checkAPIStatus() {
        console.log('Checking API status...');
        try {
            const response = await fetch('proxy.php?endpoint=status');
            if (response.ok) {
                apiStatusElement.classList.remove('offline');
                apiStatusElement.classList.add('online');
                apiStatusElement.textContent = 'Online';
                console.log('API status: Online');
            } else {
                throw new Error('API not responding');
            }
        } catch (error) {
            console.error('API status check failed:', error);
            apiStatusElement.classList.remove('online');
            apiStatusElement.classList.add('offline');
            apiStatusElement.textContent = 'Offline';
        }
    }
    
    // Add debugging to console
    console.log('USA Phone Number DNC Checker initialized successfully');
});
