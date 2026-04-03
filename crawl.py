import json
import os
from typing import Dict, Literal, TypedDict
from argparse import ArgumentParser

# from bs4 import BeautifulSoup
from requests import get
from requests.exceptions import ConnectionError
from jinja2 import Environment, FileSystemLoader, select_autoescape
from rich.console import Console
from rich.progress import Progress
from shutil import copyfile, copytree

##make sure no temp folder made
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
    paper: int
    variant: Literal[1, 2, 3]
    filename: str | None
    status: ErrorCode | Literal["TODO", "success"] | None


class Component(TypedDict):
    name: str
    paper: int
    papers: list[PaperName]
    duration: str
    total_marks: int


def initcrawl(formatraw: str, directory: str | None = None, resume=False):
    console.log("Resuming download ..")
    scrapeconfig = json.loads(formatraw)
    url = scrapeconfig["urldata"]["url"]
    useragent = scrapeconfig["urldata"]["user-agent"]
    directory: str = scrapeconfig["code"] if directory is None else directory
    if not os.path.exists(directory):
        os.makedirs(str(directory))
    
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
        for variant in [1, 2, 3]
    ] # type: ignore
    if resume:
        with open(f"{directory}/papers.json", "r") as file:
            papers = json.load(file)

    processed_papers: list[PaperName] = []
    with Progress() as progress:
        try:
            task = progress.add_task("Downloading papers...", total=len(papers))
            for index, paper in enumerate(papers):
                paperurl = f"{paper['code']}_{paper['season']}{'{0}'.format(paper['year']).zfill(2)}_{paper['papertype']}_{paper['paper']}{paper['variant']}.pdf"
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
                    response = get(f"{url}{paperurl}", headers={"User-Agent": useragent}, timeout=120)
                except ConnectionError:
                    progress.console.log(f"Failed to download {paperurl}!")
                    paper["status"] = {"code": 404, "message": "Paper doesn't exist"}
                    paper["filename"] = None
                    progress.update(task, advance=1)
                    continue
                if response.status_code != 200:
                    progress.console.log(f"Failed to download {paperurl}!")
                    paper["status"] = {"code": 404, "message": "Paper doesn't exist"}
                    paper["filename"] = None
                    progress.update(task, advance=1)
                    continue
                if "<!DOCTYPE html>" in response.text:
                    progress.console.log(f"Failed to download {paperurl}!")
                    paper["status"] = {"code": 404, "message": "Paper doesn't exist"}
                    paper["filename"] = None
                    progress.update(task, advance=1)
                    continue
                
                with open(f"{directory}/{paperurl}", "wb") as file:
                    file.write(response.content)
                progress.console.log(f"Downloaded {paperurl}!")
                paper["status"] = "success"
                paper["filename"] = paperurl

                progress.update(task, advance=1)
        except TimeoutError:
            print("\nError: Program interrupted, saving state and gracefully quitting.")
            savestate(papers, scrapeconfig, directory)
            return
    print(f"Successfully downloaded {len(processed_papers)} papers!")
    # Parse successful papers into a list
    savestate(papers, scrapeconfig, directory)
    print("Download complete!")


def savestate(papers, scrapeconfig, directory):
    """
    Saves the state of the program into directory/papers.json and directory/components.json.
    """
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
    #generate_report(papers, scrapeconfig, directory, componentpapers)


def generate_report(
    successful_papers: list[PaperName],
    scrapeconfig: Dict,
    directory: str,
    componentpapers: list[Component],
    papers: list[PaperName] = None,
):
    template = jinjaenvironment.get_template("report.html")
    with open(f"{directory}/report.html", "w") as file:
        file.write(
            template.render(
                components=componentpapers,
                code=scrapeconfig["code"],
                num_successful=len(successful_papers),
                num_failed=(len(papers) - len(successful_papers) if papers else "N/A"),
                year_start=scrapeconfig["yearstart"],
                year_end=scrapeconfig["yearend"],
            )
        )
    copyfile("templates/index.html", f"{directory}/index.html")
    try:
        copytree("templates/assets/", f"{directory}assets/")
    except FileExistsError:
        print("Assets already exists!")
    


def main():
    parser = ArgumentParser(
        description="Crawl CAIE past papers from a URL", prog="crawl"
    )
    parser.add_argument("format", help="Path to the JSON format file")
    parser.add_argument(
        "--directory", help="Directory to save the papers in", default=None
    )
    parser.add_argument(
        "--report", help="Generate a report from existing download", action="store_true"
    )
    parser.add_argument(
            "--resume", help="Resumes a download (requires directory)", action="store_true"
            )
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

    if args.report:
        if not os.path.exists(f"{args.directory}/papers.json") or not os.path.exists(
            f"{args.directory}/components.json"
        ):
            console.log(
                "[red bold]Error: papers.json or components.json not found![/red bold]"
            )
            return
        with open(f"{args.directory}/papers.json", "r") as file:
            papers = json.load(file)
        with open(f"{args.directory}/components.json", "r") as file:
            components = json.load(file)
        generate_report(papers, json.loads(formatraw), args.directory, components)
    elif not args.resume:
        initcrawl(formatraw, args.directory)


if __name__ == "__main__":
    main()
