use axum::{self, http::HeaderMap, http::HeaderValue, response::Json as ResJson, routing::*, Json};
use reqwest;
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;

#[derive(Serialize)]
struct Response {
    results: Option<Vec<bool>>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TitlesRequest {
    titles: Vec<String>,
}

const PROMPT: &str = "You are a moderator for text inputs which represent the title \
            of YouTube videos. Your task is to determine if the video titles \
            are negative or not negative. You will receive a JSON array \
            of strings which represent video titles and it is your task to \
            return a JSON array of booleans, where the boolean value \
            of that index is determined by the video title's context; if it \
            is a negative context please return true for that index, if it is \
            not negative please return false. The array of booleans returned should \
            match the length of the array of strings submitted.";

async fn analyze_handler(
    req: Json<TitlesRequest>,
) -> ResJson<Response> {
    let titles = req.titles.clone();

    // Check if the request is valid and contains titles.
    if titles.is_empty() {
        return ResJson(Response {
            results: None,
            error: Some("Invalid request format".to_string()),
        });
    }


    // Construct the OpenAI API request.
    let client = reqwest::Client::new();

    // Set up the headers for the request.
    let mut headers = HeaderMap::new();

    headers.insert("Content-Type", HeaderValue::from_str("application/json").unwrap());
    let open_ai_api_key =  match env::var("OPENAI_API_KEY"){
        Ok(key) => key,
        Err(_) => return ResJson(Response {
            results: None,
            error: Some("OpenAI API key not found".to_string()),
            })
        };
        
    headers.insert("Authorization", HeaderValue::from_str(&format!("Bearer {}", open_ai_api_key)).unwrap());
    
    // Make the request to OpenAI API.
    let prompt = PROMPT.to_string();
    let response = match client
        .post("https://api.openai.com/v1/chat/completions")
        .headers(headers)
        .json(&serde_json::json!({
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": serde_json::to_string(&req.titles).unwrap()
                }
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "VideoTitlePositivity",
                    "schema":{
                        "type": "object",
                        "properties": {
                            "titleNegativity": {
                                "type": "array",
                                "items": {"type": "boolean"}
                            }
                        }
                    }
                }
            },
            "temperature": 1,
            "max_tokens": 500,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }))
        .send()
        .await
    {
        Ok(r) => r.text().await.unwrap(),
        Err(e) => return ResJson(Response {
            results: None,
            error: Some(format!("OpenAI API call failed: {}", e)),
        }),
    };

    // Parse the JSON response from OpenAI
    let parsed_response = match serde_json::from_str::<serde_json::Value>(&response) {
        Ok(v) => v,
        Err(e) => {
            return ResJson(Response {
                results: None,
                error: Some(format!("Failed to parse OpenAI response: {}", e)),
            });
        },
    };

    // Extract the response content as a string
    let content = match parsed_response["choices"][0]["message"]["content"].as_str(){
        Some(s) => s,
        None => return ResJson(Response {
            results: None,
            error: Some("Invalid response format from OpenAI".to_string()),
        }),
    };

    // parse titleNegativity array from content
    let title_negativity = match serde_json::from_str::<serde_json::Value>(content){
        Ok(v) => v,
        Err(e) => {
            return ResJson(Response {
                results: None,
                error: Some(format!("Failed to parse titleNegativity array from response: {}", e)),
            });
        },
    };

    let boolean_array: Vec<bool> = match title_negativity["titleNegativity"].as_array(){
        Some(arr) => arr.iter().map(|v| v.as_bool().unwrap()).collect(),
        None => return ResJson(Response {
            results: None,
            error: Some("Invalid response format from OpenAI".to_string()),
        }),
    };

    //Print Diagnostics
    println!("Inference Successful\n\n");
    println!("OpenAI Response\n");
    println!("Response: {}\n\n", response);
    println!("Number of titles received: {}", titles.len());
    println!("Number of inferences: {}\n\n", boolean_array.len());
    println!("Received titles:");
    for title in titles.iter() {
        println!("{}", title);
    }
    
    println!("\n\nInferences:");
    for (title, result) in titles.iter().zip(boolean_array.iter()) {
        println!("Title: {}, Negative: {}", title, result);
    }

    // Return the boolean array as a JSON response
    ResJson(Response {
        results: Some(boolean_array),
        error: None,
    })

    
}


#[tokio::main]
async fn main(){
    let app = Router::new().route(
        "/analyze",
        post(analyze_handler),
    );
    let port = env::var("PORT").map_or_else(|_| 3000, |v| v.parse().unwrap());
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Starting server on {}", addr);
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service()).await.unwrap();

}