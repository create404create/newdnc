<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get parameters
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$phone = isset($_GET['phone']) ? $_GET['phone'] : '';

// Validate phone number for DNC and details endpoints
if (in_array($endpoint, ['tcpa', 'details']) && !preg_match('/^\d{10}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid phone number format', 'phone' => $phone]);
    exit;
}

// API endpoints configuration
$apiConfig = [
    'tcpa' => [
        'url' => 'https://api.uspeoplesearch.site/tcpa/v1?x=',
        'test_phone' => '4045093823'
    ],
    'details' => [
        'url' => 'https://api.uspeoplesearch.site/v1/?x=',
        'test_phone' => '4045094083'
    ]
];

// For status check, use test endpoint
if ($endpoint === 'status') {
    $testUrl = $apiConfig['tcpa']['url'] . $apiConfig['tcpa']['test_phone'];
    
    $ch = curl_init($testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200 && strpos($response, '"status":"ok"') !== false) {
        echo json_encode(['status' => 'online', 'message' => 'API is working']);
    } else {
        echo json_encode(['status' => 'offline', 'message' => 'API is not responding']);
    }
    exit;
}

// Handle DNC and details endpoints
if (isset($apiConfig[$endpoint])) {
    $apiUrl = $apiConfig[$endpoint]['url'] . $phone;
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
        'Referer: https://uspeoplesearch.site/'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Log the request for debugging
    error_log("DNC Checker API Call: $endpoint - Phone: $phone - Status: $httpCode");
    
    if ($curlError) {
        http_response_code(500);
        echo json_encode([
            'error' => 'CURL Error',
            'message' => $curlError,
            'phone' => $phone
        ]);
    } elseif ($httpCode !== 200) {
        http_response_code($httpCode);
        echo json_encode([
            'error' => 'API Error',
            'http_code' => $httpCode,
            'phone' => $phone
        ]);
    } else {
        // Pass through the API response
        echo $response;
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint', 'endpoint' => $endpoint]);
}
?>
