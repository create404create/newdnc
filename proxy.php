<?php
// proxy.php - Simple PHP proxy to handle API requests and avoid CORS issues

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

// Get the endpoint and phone number from the request
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$phone = isset($_GET['phone']) ? $_GET['phone'] : '';

// Validate phone number (10 digits)
if (!preg_match('/^\d{10}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid phone number format']);
    exit;
}

// API endpoints
$apiUrls = [
    'tcpa' => "https://api.uspeoplesearch.site/tcpa/v1?x={$phone}",
    'details' => "https://api.uspeoplesearch.site/v1/?x={$phone}",
    'status' => "https://api.uspeoplesearch.site/tcpa/v1?x=4045093823" // Test endpoint
];

// Check if endpoint is valid
if (!isset($apiUrls[$endpoint]) && $endpoint !== 'status') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit;
}

// For status check, use the test endpoint
$url = ($endpoint === 'status') ? $apiUrls['tcpa'] : $apiUrls[$endpoint];

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing only, remove in production

// Set headers to mimic a real browser request
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept: application/json',
    'Accept-Language: en-US,en;q=0.9',
]);

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    // If there's a cURL error
    http_response_code(500);
    echo json_encode([
        'error' => 'API request failed',
        'message' => curl_error($ch)
    ]);
} else {
    // Pass through the HTTP status code and response
    http_response_code($httpCode);
    
    // For status endpoint, return a simplified response
    if ($endpoint === 'status') {
        if ($httpCode === 200) {
            echo json_encode(['status' => 'online']);
        } else {
            echo json_encode(['status' => 'offline']);
        }
    } else {
        echo $response;
    }
}

curl_close($ch);
?>
