import json
import os
import time
from typing import Dict, Literal, TypedDict
from argparse import ArgumentParser
from requests import get
from requests.exceptions import ConnectionError
from jinja2 import Environment, FileSystemLoader, select_autoescape
from rich.console import Console
from rich.progress import Progress
from shutil import copyfile, copytree

jinjaenvironment = Environment(
    loader=FileSystemLoader("./templates/"), autoescape=select_autoescape(["html", "xml"])
)

console = Console()
print = console.print

class ErrorCode(TypedDict):
    code: int
    message: str

class PaperName(TypedDict):
    code: int | str
    year: int
    season: Literal["s", "w"]
    papertype: Literal["ms", "qp"]
    paper: int | str
    variant: int | str
    filename: str | None
    status: ErrorCode | Literal["TODO", "success"] | None

class Component(TypedDict):
    name: str
    paper: int | str
    papers: list[PaperName]
    duration: str
    total_marks: int | str

def initcrawl(formatraw: str, directory: str | None = None, resume=False):
    console.log("Starting download process...")
    scrapeconfig = json.loads(formatraw)
    url = scrapeconfig["urldata"]["url"]
    useragent = scrapeconfig["urldata"]["user-agent"]
    directory: str = scrapeconfig["code"] if directory is None else directory
    if not os.path.exists(directory):
        os.makedirs(str(directory))
    
    # Updated to test variants 1, 2, 3 AND no-variants ("", "0")
    papers: list[PaperName] = [
        {
            "code": scrapeconfig["code"],
            "year": year,
            "season": season,
            "papertype": papertype,
            "paper": paper,
            "variant": variant,
            "status": "TODO",
            "filename": None
        }
        for year in range(scrapeconfig["yearstart"], scrapeconfig["yearend"] + 1)
        for season in ["s", "w"]
        for papertype in ["ms", "qp"]
        for paper in [
            component.get("paper") for component in scrapeconfig["info"]["components"]
        ]
        for variant in [1, 2, 3, "", "0"]  # NEW: Added "" for _1.pdf and "0" for _01.pdf
    ] # type: ignore

    if resume:
        with open(f"{directory}/papers.json", "r") as file:
            papers = json.load(file)

    processed_papers: list[PaperName] = []
    with Progress() as progress:
        try:
            task = progress.add_task("Downloading papers...", total=len(papers))
            for index, paper in enumerate(papers):
                
                # --- NEW URL GENERATION LOGIC ---
                # Safely get the base paper number (turns "01" or 1 into "1")
                p_val = str(int(paper['paper'])) 
                v_val = str(paper['variant'])
                
                # Build the correct suffix depending on the variant type
                if v_val == "":
                    suffix = f"_{p_val}.pdf"        # For 0448_s17_qp_1.pdf
                elif v_val == "0":
                    suffix = f"_0{p_val}.pdf"       # For 0448_s25_qp_01.pdf
                else:
                    suffix = f"_{p_val}{v_val}.pdf" # For 9709_s15_qp_12.pdf
                    
                paperurl = f"{paper['code']}_{paper['season']}{str(paper['year']).zfill(2)}_{paper['papertype']}{suffix}"
                # --------------------------------

                if not paper['status'] == "TODO":
                    progress.console.log("Already downloaded " + paperurl + "!")
                    progress.update(task)
                    continue
                if os.path.exists(f"{directory}/{paperurl}"):
                    progress.console.log(f"File {paperurl} already exists!")
                    paper["status"] = "success"
                    paper["filename"] = paperurl
                    progress.update(task, advance=1)
                    continue

                try:
                    # Bulletproof download block
                    response = get(f"{url}{paperurl}", headers={"User-Agent": useragent}, timeout=60)
                    
                    if response.status_code != 200 or "<!DOCTYPE html>" in response.text:
                        # 404 means this specific variant format doesn't exist, just skip safely.
                        paper["status"] = {"code": 404, "message": "Paper doesn't exist"}
                        paper["filename"] = None
                        progress.update(task, advance=1)
                        continue
                        
                    with open(f"{directory}/{paperurl}", "wb") as file:
                        file.write(response.content)
                        
                except Exception as e:
                    progress.console.log(f"Skipped {paperurl} due to network error: {e}")
                    paper["status"] = {"code": 500, "message": "Network Error"}
                    paper["filename"] = None
                    progress.update(task, advance=1)
                    time.sleep(1.5)
                    continue

                progress.console.log(f"Downloaded {paperurl}!")
                paper["status"] = "success"
                paper["filename"] = paperurl
                progress.update(task, advance=1)
                
                # Pause to prevent server blocks
                time.sleep(1.5) 
                
        except TimeoutError:
            print("\nError: Program interrupted, saving state and gracefully quitting.")
            savestate(papers, scrapeconfig, directory)
            return

    print("Download complete!")

def savestate(papers, scrapeconfig, directory):
    with open(f"{directory}/papers.json", "w") as file:
        json.dump(papers, file)
    componentpapers = []
    for component in scrapeconfig["info"]["components"]:
        finalcomponent: Component = {
            "name": component["name"],
            "paper": component["paper"],
            "papers": [],
            "duration": component["duration"],
            "total_marks": component["total_marks"],
        }
        for paper in papers:
            if paper["paper"] == component["paper"]:
                finalcomponent["papers"].append(paper)
        componentpapers.append(finalcomponent)
    with open(f"{directory}/components.json", "w") as file:
        json.dump(componentpapers, file)
    # generate_report(papers, scrapeconfig, directory, componentpapers)

def main():
    parser = ArgumentParser(
        description="Crawl CAIE past papers from a URL", prog="crawl"
    )
    parser.add_argument("format", help="Path to the JSON format file")
    parser.add_argument("--directory", help="Directory to save the papers in", default=None)
    parser.add_argument("--resume", help="Resumes a download (requires directory)", action="store_true")
    args = parser.parse_args()
    
    if not os.path.exists(args.format):
        console.log("[red bold]Error: Format file does not exist![/red bold]")
        return
    with open(args.format, "r") as file:
        formatraw = file.read()
    
    if args.resume:
        if not os.path.exists(f"{args.directory}/papers.json"):
            console.log("[red bold]Error: papers.json file not found[/red bold]")
        initcrawl(formatraw, args.directory, resume=True)
    elif not args.resume:
        initcrawl(formatraw, args.directory)

if __name__ == "__main__":
    main()