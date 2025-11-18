import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

# Function to build the graph from BPMN
def build_graph(root):
    """
    Builds the graph from the BPMN process.

    Returns:
        graph (dict): Mapping from node ID to list of tuples (flow_name, target_id).
        elements (dict): Mapping from node ID to XML element.
    """
    namespace = {
        'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
        'omgdi': 'http://www.omg.org/spec/DD/20100524/DI',
        'omgdc': 'http://www.omg.org/spec/DD/20100524/DC',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }

    elements = {}
    for elem in root.findall('.//bpmn:*', namespace):
        elem_id = elem.get('id')
        if elem_id:
            elements[elem_id] = elem

    graph = defaultdict(list)
    for flow in root.findall('.//bpmn:sequenceFlow', namespace):
        source = flow.get('sourceRef')
        target = flow.get('targetRef')
        flow_name = flow.get('name')
        if source and target:
            graph[source].append((flow_name, target))

    return graph, elements

# Function to find the start event ID
def find_start_event(elements):
    """
    Identifies the start event in the BPMN process.

    Returns:
        start_id (str): The ID of the start event, or None if not found.
    """
    for elem_id, elem in elements.items():
        if elem.tag == '{http://www.omg.org/spec/BPMN/20100524/MODEL}startEvent':
            return elem_id
    return None

# Function to find all end event IDs
def find_end_events(elements):
    """
    Identifies all end events in the BPMN process.

    Returns:
        end_events (set): A set of end event IDs.
    """
    end_events = set()
    for elem_id, elem in elements.items():
        if elem.tag == '{http://www.omg.org/spec/BPMN/20100524/MODEL}endEvent':
            end_events.add(elem_id)
    return end_events

# Function to perform DFS and find all paths
def find_all_paths(graph, start, ends):
    """
    Uses Depth-First Search (DFS) to find all paths from the start node to any of the end nodes.

    Args:
        graph (dict): Adjacency list of the graph.
        start (str): The starting node ID.
        ends (set): A set of end node IDs.

    Returns:
        paths (list): A list of paths, where each path is a list of node IDs.
    """
    paths = []
    stack = [(start, [start])]

    while stack:
        current, path = stack.pop()
        if current in ends:
            paths.append(path)
            continue
        for flow_name, neighbor in graph.get(current, []):
            if neighbor not in path:  # Avoid cycles
                stack.append((neighbor, path + [neighbor]))
    return paths

# Function to map a path of node IDs to flow names
def map_path_to_flow_names(graph, path_ids):
    """
    Converts a list of node IDs to a list of flow names based on the graph.

    Args:
        graph (dict): Mapping from node ID to list of (flow_name, target_id).
        path_ids (list): A list of node IDs representing a path.

    Returns:
        flow_names (list): A list of flow names corresponding to the path.
    """
    flow_names = []
    for i in range(len(path_ids) - 1):
        current = path_ids[i]
        next_node = path_ids[i + 1]
        # Find the flow name that connects current to next_node
        flows = graph.get(current, [])
        flow_name = None
        for name, target in flows:
            if target == next_node:
                flow_name = name
                break
        if flow_name:
            flow_names.append(flow_name)
        else:
            flow_names.append("?")
    return flow_names

# Helper function to find the longest common prefix
def find_common_prefix(expressions):
    """
    Finds the longest common prefix among a list of expressions.

    Args:
        expressions (list of lists): Each expression is a list of flow names.

    Returns:
        common_prefix (list): The longest common prefix as a list of flow names.
    """
    if not expressions:
        return []

    # Find the minimum length among all expressions
    min_len = min(len(expr) for expr in expressions)
    common_prefix = []

    for i in range(min_len):
        current_prefix = [expr[i] for expr in expressions]
        if all(flow == current_prefix[0] for flow in current_prefix):
            common_prefix.append(current_prefix[0])
        else:
            break

    return common_prefix

# Helper function to find the longest valid common suffix
def find_valid_common_suffix(expressions):
    """
    Finds the longest common suffix among a list of expressions that doesn't lead to empty prefixes.

    Args:
        expressions (list of lists): Each expression is a list of flow names.

    Returns:
        common_suffix (list): The longest valid common suffix as a list of flow names.
    """
    if not expressions:
        return []

    # Find the minimum length among all expressions
    min_len = min(len(expr) for expr in expressions)

    # Iterate from the longest possible suffix to the shortest
    for suffix_len in range(min_len, 0, -1):
        current_suffix = [expr[-suffix_len:] for expr in expressions]
        if all(flow == current_suffix[0] for flow in current_suffix):
            prefixes = [expr[:-suffix_len] for expr in expressions]
            # Ensure no prefix is empty
            if all(len(prefix) > 0 for prefix in prefixes):
                return current_suffix[0]  # Return the common suffix as a flat list
    return []

# Recursive function to build the combined expression with proper factoring
def build_expression(graph, current, ends, cache):
    """
    Recursively builds the expression from the current node with proper factoring.

    Args:
        graph (dict): Mapping from node ID to list of (flow_name, target_id).
        current (str): Current node ID.
        ends (set): Set of end node IDs.
        cache (dict): Memoization cache.

    Returns:
        expr (str): Combined expression from the current node to the end.
    """
    if current in cache:
        return cache[current]

    if current in ends:
        return ''

    flows = graph.get(current, [])

    if not flows:
        return ''

    all_exprs = []

    for flow_name, target in flows:
        sub_expr = build_expression(graph, target, ends, cache)
        if sub_expr:
            expr = flow_name + sub_expr
        else:
            expr = flow_name
        all_exprs.append(expr)

    # Split each expression into list of flow names
    all_exprs_lists = [list(expr) for expr in all_exprs]

    # First, attempt to find a common prefix
    common_prefix = find_common_prefix(all_exprs_lists)

    if common_prefix:
        prefix_len = len(common_prefix)
        # Split expressions into prefix and the rest
        remaining_exprs = [expr[prefix_len:] for expr in all_exprs_lists]
        # Recursively build the expression for the remaining parts
        sub_expressions = [build_expression_from_list(graph, remaining, ends, cache) for remaining in remaining_exprs]
        # Combine the sub-expressions with alternation
        if len(sub_expressions) == 1:
            combined_sub_expr = sub_expressions[0]
        else:
            combined_sub_expr = '(' + '|'.join(sub_expressions) + ')'
        # Combine the common prefix with the combined sub-expression
        expr = ''.join(common_prefix) + combined_sub_expr
    else:
        # Attempt to find a valid common suffix
        common_suffix = find_valid_common_suffix(all_exprs_lists)
        if common_suffix:
            suffix_len = len(common_suffix)
            # Split expressions into prefix and suffix
            prefixes = [expr[:-suffix_len] for expr in all_exprs_lists]
            # Convert prefixes to strings and remove duplicates
            unique_prefixes = list(set([''.join(p) for p in prefixes]))
            # Recursively build the expression for the prefixes
            if len(unique_prefixes) == 1:
                combined_prefix_expr = unique_prefixes[0]
            else:
                combined_prefix_expr = '(' + '|'.join(unique_prefixes) + ')'
            # Combine with the common suffix
            suffix_expr = ''.join(common_suffix)
            expr = combined_prefix_expr + suffix_expr
        else:
            # If no common prefix or suffix, combine all expressions with alternation
            if len(all_exprs) == 1:
                expr = all_exprs[0]
            else:
                expr = '(' + '|'.join(all_exprs) + ')'

    cache[current] = expr
    return expr

def build_expression_from_list(graph, expr_list, ends, cache):
    """
    Builds a sub-expression from a list of flow names.

    Args:
        graph (dict): Mapping from node ID to list of (flow_name, target_id).
        expr_list (list): A list of flow names.
        ends (set): Set of end node IDs.
        cache (dict): Memoization cache.

    Returns:
        sub_expr (str): The combined sub-expression.
    """
    if not expr_list:
        return ''
    # Convert list back to string
    expr_str = ''.join(expr_list)
    # To handle possible internal factoring, recursively process the expression
    # This assumes that the expression list corresponds to node IDs, which may not be accurate
    # Therefore, it's better to treat expr_list as a sequence of flow names and build accordingly
    # However, since flow names don't correspond to node IDs, we'll treat the remaining flows as literals
    return ''.join(expr_list)


def main():
    # Get the file path from the command-line argument
    if len(sys.argv) < 2:
        print("Error: Missing BPMN file path.")
        return
    file_path = sys.argv[1]

    # Parse the BPMN file
    try:
        tree = ET.parse(file_path)
    except FileNotFoundError:
        print("Error: BPMN file not found.")
        return
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        return

    root = tree.getroot()

    # Build the graph and elements
    graph, elements = build_graph(root)

    # Find start and end events
    start_id = find_start_event(elements)
    if not start_id:
        print("No start event found.")
        return

    end_ids = find_end_events(elements)
    if not end_ids:
        print("No end events found.")
        return

    # Find all paths from start to any end event
    paths = find_all_paths(graph, start_id, end_ids)
    if not paths:
        print("No paths found from start to end.")
        return

    # Generate combined expression
    cache = {}
    combined_expression = build_expression(graph, start_id, end_ids, cache)
    
    # Output the combined expression for Node.js to read
    print(combined_expression)

if __name__ == "__main__":
    main()
