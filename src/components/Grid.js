import React, { useState, useEffect } from "react";
import { evaluate } from "mathjs";

const Grid = () => {
  const [cells, setCells] = useState([]);
  const [formulaBar, setFormulaBar] = useState("");
  const [selectedCell, setSelectedCell] = useState({ row: null, col: null });
  const rows = 10;
  const columns = 10;

  // Track the dependencies of each formula
  const [dependencies, setDependencies] = useState({});

  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = () => {
    const initialCells = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, col) => ({
        row,
        col,
        value: "",
        formula: "",
      }))
    );
    setCells(initialCells);
  };

  const handleCellClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
    const cell = cells[rowIndex][colIndex];
    setFormulaBar(cell.formula || cell.value);
  };

  const handleFormulaBarChange = (e) => {
    setFormulaBar(e.target.value);
  };

  const handleFormulaBarSubmit = () => {
    const { row, col } = selectedCell;

    if (row === null || col === null) return;

    const formula = formulaBar;

    if (formula.startsWith("=")) {
      evaluateFormula(row, col, formula.slice(1)); // Evaluate formula
    } else {
      updateCell(row, col, formula, ""); // Plain value
    }
  };

  const evaluateFormula = (rowIndex, colIndex, formula) => {
    try {
      const parsedFormula = parseCustomFunctions(formula, cells);
      const evaluatedValue = evaluate(parsedFormula); // Final evaluation with math.js
      updateCell(rowIndex, colIndex, evaluatedValue, `=${formula}`);
    } catch (error) {
      console.error("Error evaluating formula:", error);
      updateCell(rowIndex, colIndex, "ERROR", formula);
    }
  };

  const parseCustomFunctions = (formula, cells) => {
    const rangeRegex = /([A-Z]+)(\d+):([A-Z]+)(\d+)/;
    const cellRegex = /([A-Z]+)(\d+)/g; // Regular expression to match cell references (e.g., A1, B2)

    // Handle SUM, AVERAGE, MIN, MAX, COUNT
    formula = formula.replace(/(SUM|AVERAGE|MIN|MAX|COUNT)\(([^)]+)\)/g, (match, func, range) => {
      const matchRange = range.match(rangeRegex);
      if (!matchRange) return "0";

      const [_, startCol, startRow, endCol, endRow] = matchRange;
      const startColIndex = startCol.charCodeAt(0) - "A".charCodeAt(0);
      const endColIndex = endCol.charCodeAt(0) - "A".charCodeAt(0);
      const startRowIndex = parseInt(startRow, 10) - 1;
      const endRowIndex = parseInt(endRow, 10) - 1;

      // Collect all values within the range
      let values = [];
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        for (let col = startColIndex; col <= endColIndex; col++) {
          const cellValue = parseFloat(cells[row]?.[col]?.value) || 0; // Default to 0 for empty cells
          values.push(cellValue);
        }
      }

      // Apply the specified function to the collected values
      switch (func) {
        case "SUM":
          return values.reduce((sum, val) => sum + val, 0);
        case "AVERAGE":
          return values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        case "MIN":
          return values.length ? Math.min(...values) : 0;
        case "MAX":
          return values.length ? Math.max(...values) : 0;
        case "COUNT":
          return values.length;
        default:
          return "0";
      }
    });

    // Handle cell references (e.g., A1, B2)
    formula = formula.replace(cellRegex, (match, col, row) => {
      const colIndex = col.charCodeAt(0) - "A".charCodeAt(0);
      const rowIndex = parseInt(row, 10) - 1;
      const cellValue = parseFloat(cells[rowIndex]?.[colIndex]?.value) || 0;
      // Track the dependencies for this formula
      addDependency(rowIndex, colIndex, rowIndex, colIndex);
      return cellValue;
    });

    return formula;
  };

  const addDependency = (rowIndex, colIndex, dependentRow, dependentCol) => {
    setDependencies((prevDeps) => {
      const key = `${dependentRow}-${dependentCol}`;
      const updatedDeps = { ...prevDeps };
  
      // Add the dependency only if it's not already present
      if (!updatedDeps[key]) {
        updatedDeps[key] = [];
      }
  
      if (!updatedDeps[key].some(dep => dep.row === rowIndex && dep.col === colIndex)) {
        updatedDeps[key].push({ row: rowIndex, col: colIndex });
      }
  
      return updatedDeps;
    });
  };
  

  const updateCell = (rowIndex, colIndex, value, formula) => {
    const updatedCells = cells.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rIdx === rowIndex && cIdx === colIndex
          ? { ...cell, value, formula }
          : cell
      )
    );
    setCells(updatedCells);
    
    // Trigger reevaluation of dependent cells
    triggerReevaluation(rowIndex, colIndex);
  };
  

  const triggerReevaluation = (rowIndex, colIndex) => {
    // Check if any other cells depend on this cell
    Object.entries(dependencies).forEach(([key, depCells]) => {
      depCells.forEach(({ row, col }) => {
        if (row === rowIndex && col === colIndex) {
          const formula = cells[row][col].formula;
          if (formula) {
            evaluateFormula(row, col, formula.slice(1)); // Recalculate formula
          }
        }
      });
    });
  };
  

  return (
    <div>
      {/* Formula Bar */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          value={formulaBar}
          onChange={handleFormulaBarChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleFormulaBarSubmit();
            }
          }}
          placeholder="Type formula or value"
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "16px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Spreadsheet Grid */}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {/* Column Headers */}
          <tr>
            <th></th>
            {Array.from({ length: columns }, (_, colIndex) => (
              <th
                key={colIndex}
                style={{
                  border: "1px solid black",
                  padding: "5px",
                  textAlign: "center",
                  backgroundColor: "#f0f0f0",
                }}
              >
                {String.fromCharCode("A".charCodeAt(0) + colIndex)}
              </th>
            ))}
          </tr>

          {/* Rows and Cells */}
          {cells.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th
                style={{
                  border: "1px solid black",
                  padding: "5px",
                  textAlign: "center",
                  backgroundColor: "#f0f0f0",
                }}
              >
                {rowIndex + 1}
              </th>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    border: "1px solid black",
                    padding: "5px",
                    minWidth: "80px",
                    textAlign: "center",
                  }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  <input
                    type="text"
                    value={
                      selectedCell.row === rowIndex && selectedCell.col === colIndex
                        ? formulaBar
                        : cell.value
                    }
                    onChange={(e) => setFormulaBar(e.target.value)}
                    onBlur={handleFormulaBarSubmit}
                    style={{
                      width: "100%",
                      border: "none",
                      textAlign: "center",
                      backgroundColor:
                        selectedCell.row === rowIndex &&
                        selectedCell.col === colIndex
                          ? "#e0f7fa"
                          : "",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Grid;





