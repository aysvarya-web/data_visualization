// Global Parameters controlling Visualization State
const margin = { top: 40, right: 140, bottom: 60, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

let currentScene = 0; // index into the `scenes` array below (0 = 1952, 1 = 1977, 2 = 2007)
let globalData = [];

// Static Scale Configurations mapping continents to colors
const colorScale = d3.scaleOrdinal()
    .domain(["Asia", "Europe", "Africa", "Americas", "Oceania"])
    .range(["#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f"]);

const radiusScale = d3.scaleSqrt()
    .domain([2e5, 1.3e9])
    .range([3, 22]);

// Scales are static across scenes (defined once, at module scope) so that a
// country's position on screen means the same thing in every scene, and so
// scene functions can compute annotation coordinates directly from real data.
const xScale = d3.scaleLog()
    .domain([300, 50000])
    .range([0, width]);

const yScale = d3.scaleLinear()
    .domain([25, 90])
    .range([height, 0]);

// Initialize core inner SVG structural drawing group
const svg = d3.select("#chart")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

/* =========================================================
   SCENE DEFINITIONS (in chronological / display order)
   ========================================================= */
const scenes = [
    {
        year: 1952,
        title: "Scene 1: The Post-War Baseline (1952)",
        text: "Following World War II, global life expectancy was heavily constrained by wealth. A distinct gap separated isolated Western markets from emerging nations, where average lifespans rarely surpassed 45 years.",
        annotate(filtered) {
            return buildAnnotations(filtered, [
                { country: "United States", title: "Wealth Disparity", label: "Western nations sit isolated at high wealth and health metrics.", dx: 30, dy: -110 },
                { country: "Nigeria", title: "Sub-Saharan Baseline", label: "Many nations remain pinned below 40 years of life expectancy.", dx: -50, dy: 65 }
            ]);
        }
    },
    {
        year: 1977,
        title: "Scene 2: Mid-Century Structural Progression (1977)",
        text: "By 1977, medical innovation, public health modernization, and wider antibiotic access pushed life expectancy dramatically upward. Health standards across Asia began decoupling from raw economic output.",
        annotate(filtered) {
            return buildAnnotations(filtered, [
                { country: "China", title: "The Great Ascendancy", label: "East Asian nations climb into mid-tier life expectancy despite modest incomes.", dx: 40, dy: 45 }
            ]);
        }
    },
    {
        year: 2007,
        title: "Scene 3: The Interconnected Modern Era (2007)",
        text: "In 2007, global metrics show significant convergence. While income variance persists, health outcomes show global gains, with most of humanity now living past 70 years.",
        drillDown: true,
        annotate(filtered) {
            return buildAnnotations(filtered, [
                { country: "China", title: "Global Convergence", label: "Even lower-income giants now cross the 70+ year life expectancy mark.", dx: -90, dy: -55 }
            ]);
        }
    }
];

/* =========================================================
   Setup Interactive UI Triggers
   ========================================================= */
document.getElementById("next").addEventListener("click", () => {
    if (currentScene < scenes.length - 1) {
        currentScene++;
        updateScene();
    }
});

document.getElementById("prev").addEventListener("click", () => {
    if (currentScene > 0) {
        currentScene--;
        updateScene();
    }
});

/* =========================================================
   Load external CSV file structure and map values
   ========================================================= */
d3.csv("gapminder.csv").then(function(data) {
    globalData = data.map(d => ({
        country: d.country,
        continent: d.continent,
        year: +d.year,
        lifeExp: +d.lifeExp,
        gdpPercap: +d.gdpPercap,
        pop: +d.pop
    }));

    updateScene();
}).catch(error => {
    console.error("Critical issue loading target CSV data matrix:", error);
    document.getElementById("description").innerHTML =
        "<h2>Could not load gapminder.csv</h2><p>Make sure gapminder.csv sits in the same folder as index.html.</p>";
});

/* =========================================================
   Structural Scene Navigation Controller
   ========================================================= */
function updateScene() {
    document.getElementById("prev").disabled = (currentScene === 0);
    document.getElementById("next").disabled = (currentScene === scenes.length - 1);
    document.getElementById("scene-indicator").textContent =
        `Scene ${currentScene + 1} of ${scenes.length}`;

    const scene = scenes[currentScene];
    const filtered = globalData.filter(d => d.year === scene.year);

    document.getElementById("description").innerHTML = `<h2>${scene.title}</h2>`;
    document.getElementById("annotation").innerHTML = scene.text +
        (scene.drillDown ? " <br/><strong>Drill-Down Option Available:</strong> Hover directly over any individual circle to see its exact statistics." : "");

    drawBaseChart(filtered, scene.annotate(filtered));
}

/* =========================================================
   Helper: build annotation objects from real data points
   ========================================================= */
function buildAnnotations(filtered, specs) {
    return specs
        .map(spec => {
            const d = filtered.find(row => row.country === spec.country);
            if (!d) return null;
            return {
                note: { title: spec.title, label: spec.label, wrap: 180 },
                x: xScale(d.gdpPercap),
                y: yScale(d.lifeExp),
                dx: spec.dx,
                dy: spec.dy,
                subject: { radius: radiusScale(d.pop) + 4 }
            };
        })
        .filter(Boolean);
}

/* =========================================================
   Master Canvas Generator
   ========================================================= */
function drawBaseChart(filteredData, annotationsArray) {
    svg.selectAll("*").remove(); // Wipe previous canvas space completely

    // Build Structural Axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(10, d3.format(",d")));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Append X-Axis Label Elements
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text("GDP Per Capita (USD, Logarithmic Scale)");

    // Append Y-Axis Label Elements
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text("Life Expectancy (Years)");

    // Data Bubble Bindings
    const bubbles = svg.selectAll(".bubble")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", d => xScale(d.gdpPercap))
        .attr("cy", d => yScale(d.lifeExp))
        .attr("r", d => radiusScale(d.pop))
        .attr("fill", d => colorScale(d.continent))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.75)
        .style("opacity", 0.75);

    // Call Tooltip Activation Logic
    setupTooltip(bubbles);

    // Render Explicit d3-annotation Component Callouts
    const makeAnnotations = d3.annotation()
        .type(d3.annotationCallout)
        .annotations(annotationsArray);

    svg.append("g")
        .attr("class", "annotation-group annotation")
        .call(makeAnnotations);

    // Create Legend Container Box
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    colorScale.domain().forEach((continent, index) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${index * 22})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", colorScale(continent))
            .attr("rx", 2);

        row.append("text")
            .attr("x", 22)
            .attr("y", 11)
            .style("font-size", "12px")
            .text(continent);
    });
}

/* =========================================================
   User-driven Drill-down Exploration Tooltip Logic
   ========================================================= */
function setupTooltip(selection) {
    const tooltip = d3.select("#tooltip");

    selection.on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#000000").attr("stroke-width", 1.5).style("opacity", 1);
        tooltip.style("opacity", 1)
            .html(`
                <strong>${d.country}</strong> (${d.continent})<br/>
                Population: ${d3.format(",")(d.pop)}<br/>
                GDP per Capita: $${d3.format(",.0f")(d.gdpPercap)}<br/>
                Life Expectancy: ${d.lifeExp.toFixed(1)} years
            `);
    })
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseleave", function() {
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 0.75).style("opacity", 0.75);
        tooltip.style("opacity", 0);
    });
}
