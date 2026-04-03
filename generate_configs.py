import json
import os

# 1. Master List: Define your subjects here
SUBJECTS = [
    {
        "code": 9709,
        "name": "AS and A-Level Mathematics",
        "short_name": "Mathematics",
        "type": "AS and A-Level",
        "yearstart": 10,  # 2-digit format for years (e.g., 2010 = 10)
        "yearend": 25,    # 2025 = 25
        "info_duration": "1h 30m", # Overall subject duration/marks (for the report)
        "info_total_marks": 75,
        "components": [
            {"name": "Pure Mathematics 1", "paper": 1, "duration": "1h 30m", "total_marks": 75},
            {"name": "Pure Mathematics 3", "paper": 3, "duration": "1h 30m", "total_marks": 75},
            {"name": "Probability and Statistics 1/Mechanics 2 until 2020", "paper": 5, "duration": "1h 15m", "total_marks": 50},
            {"name": "Probability and Statistics 2/Probability and Statistics 1 until 2020", "paper": 6, "duration": "1h 15m", "total_marks": 50},
            {"name": "Probability and Statistics 2 until 2020", "paper": 7, "duration": "1h 15m", "total_marks": 50}
        ]
    },
    {
        "code": 2210,
        "name": "O-Level Computer Science",
        "short_name": "Computer Science",
        "type": "O-Level",
        "yearstart": 15,  
        "yearend": 25,    
        "info_duration": "1h 45m",
        "info_total_marks": 75,
        "components": [
            {"name": "Computer Systems", "paper": 1, "duration": "1h 45m", "total_marks": 75},
            {"name": "Algorithms, Programming and Logic", "paper": 2, "duration": "1h 45m", "total_marks": 75}
        ]
    },
    {
        "code": "0620",
        "name": "IGCSE Chemistry",
        "short_name": "Chemistry",
        "type": "IGCSE",
        "yearstart": 10,
        "yearend": 23,
        "info_duration": "Varies", 
        "info_total_marks": 100, 
        "components": [
            {"name": "Multiple Choice", "paper": 1, "duration": "45m", "total_marks": 40},
            {"name": "Paper 2 (Multichoice before 2016, Theory core after 2016)", "paper": 2, "duration": "1h 15m", "total_marks": 75},
            {"name": "Paper 3 (Theory Core after 2016)", "paper": 3, "duration": "1h 15m", "total_marks": 50},
            {"name": "Paper 4 (Theory Extended after 2016)", "paper": 4, "duration": "1h 15m", "total_marks": 50}
        ]
    },
    {
        "code": "0625",
        "name": "IGCSE Physics",
        "short_name": "Physics",
        "type": "IGCSE",
        "yearstart": 10,
        "yearend": 23,
        "info_duration": "Varies",
        "info_total_marks": 100,
        "components": [
            {"name": "Multiple Choice", "paper": 1, "duration": "45m", "total_marks": 40},
            {"name": "Paper 2 (Multichoice before 2016, Theory core after 2016)", "paper": 2, "duration": "1h 15m", "total_marks": 75},
            {"name": "Paper 3 (Theory Core after 2016)", "paper": 3, "duration": "1h 15m", "total_marks": 50},
            {"name": "Paper 4 (Theory Extended after 2016)", "paper": 4, "duration": "1h 15m", "total_marks": 50}
        ]
    },
    {
        "code": 9231,
        "name": "AS and A-Level Mathematics - Further",
        "short_name": "Further Mathematics",
        "type": "AS and A-Level",
        "yearstart": 10,
        "yearend": 25,
        "info_duration": "2h",
        "info_total_marks": 75,
        "components": [
            {"name": "Further Pure Mathematics 1", "paper": 1, "duration": "2h", "total_marks": 75},
            {"name": "Further Pure Mathematics 2", "paper": 2, "duration": "2h", "total_marks": 75},
            {"name": "Further Mechanics", "paper": 3, "duration": "1h 30m", "total_marks": 75},
            {"name": "Further Probability and Statistics", "paper": 4, "duration": "1h 30m", "total_marks": 50}
        ]
    },
    {
        "code": 9702,
        "name": "AS and A-Level Physics",
        "short_name": "Physics",
        "type": "AS and A-Level",
        "yearstart": 10,
        "yearend": 24,
        "info_duration": "1h 30m",
        "info_total_marks": 75,
        "components": [
            {"name": "AS Multi-Choice", "paper": 1, "duration": "1h 30m", "total_marks": 75},
            {"name": "AS Structured Response", "paper": 2, "duration": "1h 30m", "total_marks": 75},
            {"name": "A2 Structured", "paper": 4, "duration": "1h 30m", "total_marks": 75}
        ]
    },
    {
        "code": 9708,
        "name": "AS & A-Level Economics",
        "short_name": "Economics",
        "type": "AS and A-Level",
        "yearstart": 10,
        "yearend": 25,
        "info_duration": "1h 30m",
        "info_total_marks": 75,
        "components": [
            {"name": "AS Multi-Choice", "paper": 1, "duration": "1h 30m", "total_marks": 75},
            {"name": "AS Data Response and Essays", "paper": 2, "duration": "2h", "total_marks": 75},
            {"name": "A-Level Multi-Choice", "paper": 3, "duration": "2h", "total_marks": 75},
            {"name": "A-Level Data Response and Essays", "paper": 4, "duration": "2h", "total_marks": 75}
        ]
    }
]

# 2. These stay the same for all files
BASE_URL = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

def generate_configs():
    # Create the output directory
    output_dir = "configs"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Loop through subjects and build the exact JSON structure
    for subject in SUBJECTS:
        
        # Inject the subject code into each individual component
        formatted_components = []
        for comp in subject["components"]:
            formatted_components.append({
                "name": comp["name"],
                "code": subject["code"],
                "duration": comp["duration"],
                "total_marks": comp["total_marks"],
                "paper": comp["paper"]
            })

        # Build the final dictionary to match the requested format
        config = {
            "code": subject["code"],
            "name": subject["name"],
            "short_name": subject["short_name"],
            "type": subject["type"],
            "yearstart": subject["yearstart"],
            "yearend": subject["yearend"],
            "info": {
                "duration": subject["info_duration"],
                "total_marks": subject["info_total_marks"],
                "components": formatted_components
            },
            "urldata": {
                "url": BASE_URL,
                "user-agent": USER_AGENT
            }
        }

        # Save to file
        filename = f"{output_dir}/format_{subject['code']}.json"
        with open(filename, "w") as file:
            json.dump(config, file, indent=4)
        
        print(f"Successfully generated: {filename}")

if __name__ == "__main__":
    generate_configs()